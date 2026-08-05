import * as invoiceRepository from '../repositories/invoiceRepository.js';
import * as clientRepository from '../repositories/clientRepository.js';
import * as digifactClient from '../lib/digifactClient.js';
import { buildFacturaPayload } from '../lib/nucBuilder.js';
import { ApiError } from '../utils/ApiError.js';

const IVA_RATE = 0.12;

// Campos que solo puede escribir el flujo de certificacion/anulacion (no el
// cliente via POST/PUT), para que nadie pueda simular una factura certificada.
const PROTECTED_FIELDS = [
  'estado', 'number', 'subtotal', 'iva', 'total', 'serie_dte', 'numero_dte', 'uuid_dte',
  'fecha_certificacion', 'xml_certificado', 'pdf_url', 'digifact_response', 'digifact_error',
  'motivo_anulacion', 'anulado_at',
];

function stripProtected(data) {
  for (const field of PROTECTED_FIELDS) delete data[field];
  return data;
}

function normalize(data) {
  if (data.tipo_dte === '' || data.tipo_dte === undefined) data.tipo_dte = 'FACT';
  if (data.moneda === '' || data.moneda === undefined) data.moneda = 'GTQ';
  if (data.descuento === '' || data.descuento === undefined) data.descuento = 0;
  if (data.quote_id === '') data.quote_id = null;
  if (data.work_order_id === '') data.work_order_id = null;
  if (data.observations === '') data.observations = null;
  return data;
}

/**
 * `unit_price` ya incluye IVA (igual que en cotizaciones/ordenes de trabajo).
 * El IVA se extrae del total post-descuento, no se suma aparte.
 */
function calcTotals(items, descuento) {
  const subtotal = items.reduce((s, i) => s + (parseFloat(i.quantity) || 1) * (parseFloat(i.unit_price) || 0), 0);
  const total = subtotal - (parseFloat(descuento) || 0);
  const iva = total - total / (1 + IVA_RATE);
  return { subtotal, iva, total };
}

function toGtDateTimeString(value) {
  const d = value ? new Date(value) : new Date();
  const gt = new Date(d.getTime() - 6 * 60 * 60 * 1000);
  const pad = (v) => String(v).padStart(2, '0');
  return `${gt.getUTCFullYear()}-${pad(gt.getUTCMonth() + 1)}-${pad(gt.getUTCDate())}T${pad(gt.getUTCHours())}:${pad(gt.getUTCMinutes())}:${pad(gt.getUTCSeconds())}`;
}

export async function list() {
  return invoiceRepository.getAll();
}

export async function getById(id) {
  const invoice = await invoiceRepository.findById(id);
  if (!invoice) throw new ApiError(404, 'Factura no encontrada');
  return invoice;
}

export async function create({ items, ...data }) {
  const number = await invoiceRepository.getNextNumber();
  stripProtected(data);
  normalize(data);
  const { subtotal, iva, total } = calcTotals(items || [], data.descuento);
  data.subtotal = subtotal;
  data.iva = iva;
  data.total = total;
  return invoiceRepository.create({ ...data, number, estado: 'borrador' }, items || []);
}

export async function update(id, { items, ...data }) {
  const existing = await invoiceRepository.findById(id);
  if (!existing) throw new ApiError(404, 'Factura no encontrada');
  if (existing.estado !== 'borrador') {
    throw new ApiError(409, 'Solo se pueden editar facturas en borrador');
  }
  stripProtected(data);
  normalize(data);
  const effectiveItems = items ?? existing.items;
  const effectiveDescuento = data.descuento ?? existing.descuento;
  const { subtotal, iva, total } = calcTotals(effectiveItems, effectiveDescuento);
  data.subtotal = subtotal;
  data.iva = iva;
  data.total = total;
  return invoiceRepository.update(id, data, items);
}

export async function remove(id) {
  const existing = await invoiceRepository.findById(id);
  if (!existing) throw new ApiError(404, 'Factura no encontrada');
  if (existing.estado !== 'borrador') {
    throw new ApiError(409, 'Solo se pueden eliminar facturas en borrador');
  }
  return invoiceRepository.remove(id);
}

/** Certifica la factura ante Digifact (FEL) y persiste el resultado. */
export async function certify(id) {
  const existing = await invoiceRepository.findById(id);
  if (!existing) throw new ApiError(404, 'Factura no encontrada');
  if (existing.estado === 'certificado') throw new ApiError(409, 'La factura ya esta certificada');
  if (existing.estado === 'anulado') throw new ApiError(409, 'La factura esta anulada');
  if (!existing.items || existing.items.length === 0) {
    throw new ApiError(409, 'La factura no tiene lineas para certificar');
  }

  const client = await clientRepository.findById(existing.client_id);
  if (!client) throw new ApiError(409, 'El cliente de la factura ya no existe');

  const payload = buildFacturaPayload(existing, client);
  let response;
  try {
    response = await digifactClient.certifyDte(payload);
  } catch (err) {
    await invoiceRepository.update(id, {
      estado: 'error',
      digifact_error: err.message || 'Error desconocido al certificar',
      digifact_response: err.details ? JSON.stringify(err.details) : null,
    });
    throw err;
  }

  if (response.code !== '1') {
    await invoiceRepository.update(id, {
      estado: 'error',
      digifact_error: response.message || 'Digifact rechazo el documento',
      digifact_response: JSON.stringify(response),
    });
    throw new ApiError(502, response.message || 'Digifact rechazo el documento', response);
  }

  return invoiceRepository.update(id, {
    estado: 'certificado',
    serie_dte: response.batch,
    numero_dte: response.serial,
    uuid_dte: response.authNumber,
    fecha_certificacion: response.enrolledTimeStamp ? new Date(response.enrolledTimeStamp) : new Date(),
    xml_certificado: response.responseData1 ? Buffer.from(response.responseData1, 'base64').toString('utf8') : null,
    digifact_response: JSON.stringify(response),
    digifact_error: null,
  });
}

/** Anula una factura ya certificada (llama a Digifact y luego marca el estado local). */
export async function voidInvoice(id, motivo) {
  const existing = await invoiceRepository.findById(id);
  if (!existing) throw new ApiError(404, 'Factura no encontrada');
  if (existing.estado !== 'certificado') {
    throw new ApiError(409, 'Solo se pueden anular facturas certificadas');
  }
  if (!motivo || !motivo.trim()) {
    throw new ApiError(400, 'El motivo de anulacion es obligatorio');
  }

  const client = await clientRepository.findById(existing.client_id);
  await digifactClient.cancelDte({
    authNumber: existing.uuid_dte,
    idReceptor: client?.nit || client?.dpi || 'CF',
    fechaEmisionOriginal: toGtDateTimeString(existing.fecha_certificacion),
    motivo: motivo.trim(),
  });

  return invoiceRepository.update(id, {
    estado: 'anulado',
    motivo_anulacion: motivo.trim(),
    anulado_at: new Date(),
  });
}
