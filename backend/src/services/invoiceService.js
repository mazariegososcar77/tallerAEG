import * as invoiceRepository from '../repositories/invoiceRepository.js';
import * as workOrderRepository from '../repositories/workOrderRepository.js';
import * as quoteRepository from '../repositories/quoteRepository.js';
import * as felCertifier from './felCertifier.js';
import { ApiError } from '../utils/ApiError.js';

export async function list() {
  return invoiceRepository.getAll();
}

export async function getById(id) {
  const invoice = await invoiceRepository.findById(id);
  if (!invoice) throw new ApiError(404, 'Factura no encontrada');
  return invoice;
}

export async function getByWorkOrderId(workOrderId) {
  return invoiceRepository.findByWorkOrderId(workOrderId);
}

/** Idempotente: si la orden ya tiene factura, la devuelve en vez de crear otra. */
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
  return invoiceRepository.create({
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
}

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
