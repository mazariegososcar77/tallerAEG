// Este archivo maneja las FACTURAS: consultarlas, generarlas automaticamente al
// terminar un reporte de trabajo, y "certificarlas" (el paso de marcarlas como
// facturas fiscales validas). Es el ultimo eslabon del flujo del taller:
// Cotizacion -> Orden de Trabajo -> Reporte de Trabajo -> Factura.
import * as invoiceRepository from '../repositories/invoiceRepository.js';
import * as workOrderRepository from '../repositories/workOrderRepository.js';
import * as quoteRepository from '../repositories/quoteRepository.js';
import * as workReportRepository from '../repositories/workReportRepository.js';
import * as felCertifier from './felCertifier.js';
import * as workOrderDocumentService from './workOrderDocumentService.js';
import * as numberingService from './numberingService.js';
import * as clientRepository from '../repositories/clientRepository.js';
import * as felDocumentRepository from '../repositories/felDocumentRepository.js';
import * as digifactClient from '../lib/digifactClient.js';
import { receiverTaxId } from '../lib/nucBuilder.js';
import * as notificationService from './notificationService.js';
import * as settingsService from './settingsService.js';
import { generarFacturaPDF } from '../utils/pdfGenerator.js';
import { ApiError } from '../utils/ApiError.js';

// Devuelve la lista completa de facturas.
export async function list() {
  return invoiceRepository.getAll();
}

// Busca una factura por id. Si no existe, avisa con un error.
export async function getById(id) {
  const invoice = await invoiceRepository.findById(id);
  if (!invoice) throw new ApiError(404, 'Factura no encontrada');
  return invoice;
}

// Busca la factura asociada a una orden de trabajo (una orden solo puede tener
// una factura).
export async function getByWorkOrderId(workOrderId) {
  return invoiceRepository.findByWorkOrderId(workOrderId);
}

/**
 * Genera la factura de una orden de trabajo automaticamente cuando se finaliza su
 * reporte de trabajo (ver workReportService.finalize). Si la orden viene de una
 * cotizacion, copia las lineas (piezas/mano de obra) de esa cotizacion; si no,
 * genera una sola linea generica con el total de la orden.
 * Es idempotente: si la orden ya tiene factura, devuelve esa en vez de crear otra
 * (para que no se dupliquen facturas si alguien vuelve a finalizar el reporte).
 */
export async function createFromWorkReport(report) {
  const existing = await invoiceRepository.findByWorkOrderId(report.work_order_id);
  if (existing) return existing;

  const order = await workOrderRepository.findById(report.work_order_id);
  if (!order) throw new ApiError(404, 'Orden de trabajo no encontrada');

  let items = [];
  if (order.quote_id) {
    const quote = await quoteRepository.findById(order.quote_id);
    if (quote) {
      items = quote.items.map((i) => ({
        description: i.description,
        quantity: i.quantity,
        unit_price: i.unit_price,
      }));
    }
  }
  if (items.length === 0) {
    items = [{
      description: `Servicio segun orden de trabajo No. ${order.number}`,
      quantity: 1,
      unit_price: order.total || 0,
    }];
  }
  const subtotal = items.reduce((s, i) => s + (parseFloat(i.quantity) || 1) * (parseFloat(i.unit_price) || 0), 0);
  const total = order.total > 0 ? Number(order.total) : subtotal;

  const number = await numberingService.getNextNumber('invoice');
  const invoice = await invoiceRepository.create({
    number,
    work_order_id: order.id,
    work_report_id: report.id,
    quote_id: order.quote_id || null,
    client_id: order.client_id,
    date: new Date().toISOString().slice(0, 10),
    subtotal,
    discount: 0,
    total,
    status: 'pendiente_certificacion',
  }, items);

  // "Codigo" del talonario: hoy Abdias lo escribia a mano cuando facturaba, para
  // dejar la orden y la factura asociadas. Se llena solo con el numero interno de
  // la factura recien creada; el dia que felCertifier deje de ser un stub, certify()
  // debe repetir esta misma actualizacion con el numero fiscal real (fel_number).
  await workOrderRepository.update(order.id, { dte_number: invoice.fel_number || invoice.number });

  return invoice;
}

/**
 * Genera la factura de una orden de trabajo del flujo "Post" (donde, a diferencia
 * de Pre, la cotizacion se arma DESPUES del reporte, asi que no hay factura
 * automatica al finalizarlo — ver workReportService.finalize). Se llama a mano,
 * normalmente desde el boton "Generar Factura" de la orden, una vez que ya se
 * aprobo la cotizacion con el diagnostico real. Reutiliza createFromWorkReport
 * (misma logica de armar las lineas desde quote_items, mismo idempotente).
 */
export async function createFromWorkOrder(workOrderId) {
  const order = await workOrderRepository.findById(workOrderId);
  if (!order) throw new ApiError(404, 'Orden de trabajo no encontrada');
  if (!order.quote_id) throw new ApiError(400, 'La orden todavia no tiene una cotizacion asociada');
  const quote = await quoteRepository.findById(order.quote_id);
  if (!quote || quote.status !== 'aprobada') throw new ApiError(400, 'La cotizacion debe estar aprobada antes de facturar');
  const report = await workReportRepository.findByWorkOrderId(workOrderId);
  if (!report || report.status !== 'finalizado') throw new ApiError(400, 'El reporte de trabajo debe estar finalizado antes de facturar');
  // Mismo paso previo que en el flujo Pre: nadie factura sin que alguien haya
  // revisado los documentos de la orden. Aqui el bloqueo va justo antes de crear la
  // factura porque es lo unico que hace esta funcion; en Pre va al inicio de
  // finalize, que ademas descuenta inventario.
  await workOrderDocumentService.requireReviewed(workOrderId);
  return createFromWorkReport(report);
}

// Facturas que se estan certificando en este momento (por id). Un doble clic en "Certificar", o
// dos personas a la vez, mandarian dos veces el mismo documento a Digifact y la SAT emitiria
// DOS facturas fiscales. Este candado es por proceso, que es suficiente: el backend corre en una
// sola instancia.
const certificando = new Set();

/**
 * Certifica una factura ante la SAT a traves de Digifact y guarda lo que devuelve: UUID, serie y
 * numero fiscales, el ambiente (pruebas o real), la fecha de emision exacta y los archivos
 * oficiales (XML y PDF). Despues, si hay un webhook de n8n configurado, le manda el PDF oficial
 * al correo indicado.
 *
 * Mientras falten las credenciales de Digifact (DIGIFACT_NIT/USERNAME/PASSWORD), felCertifier es
 * un stub: la factura pasa a "certificada" solo para uso administrativo, SIN datos fiscales y sin
 * validez ante la SAT (ver felCertifier.js). No se puede certificar una factura anulada, y hace
 * falta el correo del cliente. Si ya estaba certificada, no hace nada (evita re-certificar).
 */
export async function certify(id, email) {
  const invoice = await invoiceRepository.findById(id);
  if (!invoice) throw new ApiError(404, 'Factura no encontrada');
  if (invoice.status === 'certificada') return invoice;
  if (invoice.status === 'anulada') throw new ApiError(409, 'La factura esta anulada');
  if (!email) throw new ApiError(400, 'El correo del cliente es obligatorio');
  if (certificando.has(Number(id))) throw new ApiError(409, 'Esta factura ya se esta certificando. Espera unos segundos.');

  certificando.add(Number(id));
  try {
    const fel = await felCertifier.certify(invoice);
    const datos = {
      status: 'certificada',
      client_email: email,
      fel_certifier: fel.fel_certifier,
      fel_uuid: fel.fel_uuid,
      fel_series: fel.fel_series,
      fel_number: fel.fel_number,
      fel_issued_at: fel.fel_issued_at,
      fel_environment: fel.fel_environment,
      fel_certified_at: fel.fel_uuid ? new Date() : null,
    };

    // Punto delicado: aqui la SAT YA emitio la factura. Si guardarla falla, el usuario veria un
    // error, volveria a certificar y saldria una segunda factura fiscal. Por eso se reintenta una
    // vez y, si tampoco, el UUID queda escrito en el log para poder recuperarlo a mano.
    let updated;
    try {
      updated = await invoiceRepository.update(id, datos);
    } catch (err) {
      console.error('[facturacion] Digifact CERTIFICO la factura', id, 'pero no se pudo guardar. UUID:', fel.fel_uuid, 'serie:', fel.fel_series, 'numero:', fel.fel_number, err.message);
      updated = await invoiceRepository.update(id, datos);
    }

    if (fel.documents) {
      try {
        await felDocumentRepository.save(id, 'certificacion', fel.documents);
      } catch (err) {
        // No es grave: getFelFile los vuelve a bajar de Digifact cuando se pidan.
        console.error('[facturacion] no se pudieron guardar los archivos oficiales de la factura', id, err.message);
      }
    }

    // El "Codigo" del talonario de la orden pasa a ser el numero fiscal real (antes era el
    // interno de la factura, ver createFromWorkReport).
    if (fel.fel_uuid) {
      try {
        await workOrderRepository.update(updated.work_order_id, { dte_number: [fel.fel_series, fel.fel_number].filter(Boolean).join('-') });
      } catch (err) {
        console.error('[facturacion] no se pudo actualizar el numero DTE de la orden:', err.message);
      }
    }

    const correo = fel.fel_uuid
      ? await enviarCorreo(await invoiceRepository.findById(id), email).catch((e) => ({ sent: false, reason: e.message }))
      : { sent: false, reason: 'sin_certificacion_real' };
    return { ...(await invoiceRepository.findById(id)), email_result: correo };
  } finally {
    certificando.delete(Number(id));
  }
}

// Manda el PDF oficial de una factura certificada al correo indicado, por n8n. Devuelve
// { sent, ... } y NO lanza cuando n8n no esta configurado: la factura ya es valida sin el correo.
async function enviarCorreo(invoice, email) {
  const settings = await settingsService.getSettings();
  if (!settings.n8n_webhook_url) return { sent: false, reason: 'sin_webhook' };
  const file = await getFelFile(invoice.id, 'pdf');
  await notificationService.sendInvoiceEmail({ invoice, email, pdfBase64: file.data.toString('base64') });
  await invoiceRepository.update(invoice.id, { email_sent_at: new Date(), client_email: email });
  return { sent: true, email };
}

/** Reenvia por correo el PDF oficial de una factura ya certificada (boton "Enviar por correo"). */
export async function sendEmail(id, email) {
  const invoice = await getById(id);
  if (invoice.status !== 'certificada' || !invoice.fel_uuid) throw new ApiError(409, 'Solo se puede enviar una factura certificada ante la SAT');
  const destino = email || invoice.client_email;
  if (!destino) throw new ApiError(400, 'Indica el correo al que se enviara');
  const settings = await settingsService.getSettings();
  if (!settings.n8n_webhook_url) throw new ApiError(400, 'No hay un webhook de n8n configurado. Se configura en Configuracion > Notificaciones.');
  const file = await getFelFile(id, 'pdf');
  await notificationService.sendInvoiceEmail({ invoice, email: destino, pdfBase64: file.data.toString('base64') });
  await invoiceRepository.update(id, { email_sent_at: new Date(), client_email: destino });
  return { sent: true, email: destino };
}

/**
 * Anula una factura certificada: le pide a Digifact/SAT que la cancele y la marca "anulada".
 * Solo si la factura se certifico de verdad (tiene UUID); una factura "certificada" solo
 * administrativamente (sin credenciales) se anula solo aqui. Exige el motivo. Una factura del
 * ambiente de pruebas no se puede anular estando en produccion (y al reves): el UUID no
 * existiria del otro lado.
 */
export async function cancel(id, reason) {
  const invoice = await getById(id);
  if (invoice.status === 'anulada') throw new ApiError(409, 'La factura ya esta anulada');
  if (invoice.status !== 'certificada') throw new ApiError(409, 'Solo se puede anular una factura certificada');
  const motivo = String(reason || '').trim();
  if (motivo.length < 5) throw new ApiError(400, 'Escribe el motivo de la anulacion (minimo 5 caracteres)');

  let datos = { status: 'anulada', cancelled_at: new Date(), cancel_reason: motivo };
  let documentos = null;

  if (invoice.fel_uuid) {
    if (!digifactClient._internal.isConfigured()) throw new ApiError(503, 'Digifact no esta configurado: no se puede anular ante la SAT');
    if (invoice.fel_environment && invoice.fel_environment !== digifactClient.environment()) {
      throw new ApiError(409, `Esta factura se certifico en el ambiente de ${invoice.fel_environment === 'prod' ? 'produccion' : 'pruebas'} y el sistema esta apuntando a ${digifactClient.environment() === 'prod' ? 'produccion' : 'pruebas'}.`);
    }
    if (!invoice.fel_issued_at) throw new ApiError(409, 'A esta factura le falta la fecha de emision original; anulala desde el portal de Digifact.');
    const client = await clientRepository.findById(invoice.client_id);
    const response = await digifactClient.cancelDte({
      authNumber: invoice.fel_uuid,
      idReceptor: receiverTaxId(client),
      fechaEmisionOriginal: invoice.fel_issued_at,
      motivo,
    });
    if (String(response?.Codigo ?? response?.code) !== '1') {
      throw new ApiError(502, response?.Mensaje || response?.message || 'Digifact rechazo la anulacion', response);
    }
    datos.fel_cancel_uuid = response.Autorizacion || null;
    documentos = digifactClient.extractDocuments(response);
  }

  const updated = await invoiceRepository.update(id, datos);
  if (documentos) {
    try { await felDocumentRepository.save(id, 'anulacion', documentos); } catch (err) { console.error('[facturacion] no se guardaron los archivos de la anulacion:', err.message); }
  }
  return updated;
}

/**
 * Devuelve un archivo oficial de la factura: { data, contentType, filename }. `kind` es 'pdf' o 'xml'.
 * Sale de lo guardado al certificar; si no esta (facturas anteriores, o un fallo al guardar) se
 * baja de Digifact por su UUID y se guarda para la proxima vez.
 */
export async function getFelFile(id, kind) {
  const invoice = await getById(id);
  if (!invoice.fel_uuid) throw new ApiError(404, 'Esta factura no tiene documento fiscal (no se certifico ante la SAT)');
  let stored = await felDocumentRepository.find(id, 'certificacion');
  if (!stored || !(kind === 'xml' ? stored.xml : stored.pdf)) {
    const docs = digifactClient.extractDocuments(await digifactClient.getDocument(invoice.fel_uuid));
    if (docs.xml || docs.pdf) {
      await felDocumentRepository.save(id, 'certificacion', docs).catch(() => {});
      stored = { xml: docs.xml, pdf: docs.pdf };
    }
  }
  const data = kind === 'xml' ? (stored?.xml ? Buffer.from(stored.xml, 'utf8') : null) : stored?.pdf;
  if (!data) throw new ApiError(404, 'No se encontro el archivo oficial de esta factura');
  const base = `factura-${invoice.fel_series || ''}${invoice.fel_number ? '-' + invoice.fel_number : invoice.number}`.replace(/^-/, '');
  return kind === 'xml'
    ? { data, contentType: 'application/xml', filename: `${base}.xml` }
    : { data, contentType: 'application/pdf', filename: `${base}.pdf` };
}

/** Consulta un NIT en la SAT para mostrar el nombre registrado antes de certificar. */
export async function lookupNit(nit) {
  if (!digifactClient._internal.isConfigured()) return { configured: false, found: false, name: null };
  const result = await digifactClient.lookupNit(nit);
  return { configured: true, found: Boolean(result), name: result?.name || null, environment: digifactClient.environment() };
}

/** Estado de la integracion con Digifact, para avisarlo en la pantalla de Facturacion. */
export function felStatus() {
  const configured = digifactClient._internal.isConfigured();
  return { configured, environment: configured ? digifactClient.environment() : null };
}
