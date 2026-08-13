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

  const number = await invoiceRepository.getNextNumber();
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

/**
 * "Certifica" una factura: guarda el correo del cliente y le pide al certificador
 * fiscal (felCertifier.js) los datos oficiales SAT. IMPORTANTE: hoy felCertifier
 * es un simulador que no esta conectado a ningun proveedor real, asi que esos datos
 * fiscales (UUID/serie/numero) quedan vacios — la factura pasa a estado
 * "certificada" solo para uso interno del taller, no es todavia una factura fiscal
 * valida ante la SAT. No se puede certificar una factura ya anulada, y hace falta
 * el correo del cliente para poder continuar. Si ya estaba certificada, no hace
 * nada de nuevo (evita re-certificar por error).
 */
export async function certify(id, email) {
  const invoice = await invoiceRepository.findById(id);
  if (!invoice) throw new ApiError(404, 'Factura no encontrada');
  if (invoice.status === 'certificada') return invoice;
  if (invoice.status === 'anulada') throw new ApiError(409, 'La factura esta anulada');
  if (!email) throw new ApiError(400, 'El correo del cliente es obligatorio');

  const fel = await felCertifier.certify(invoice);
  return invoiceRepository.update(id, {
    status: 'certificada',
    client_email: email,
    fel_certifier: fel.fel_certifier,
    fel_uuid: fel.fel_uuid,
    fel_series: fel.fel_series,
    fel_number: fel.fel_number,
  });
}
