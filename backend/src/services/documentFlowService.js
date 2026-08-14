// Este archivo arma el "Flujo de Documentos" (o "Mapa de Relaciones"): el mapa
// visual, al estilo del Document Flow de SAP, que muestra para una Cotizacion,
// Orden de Trabajo, Reporte de Trabajo o Factura la cadena completa de
// documentos ligados a ella -- Cotizacion -> Orden(es) de Trabajo -> Reporte de
// Trabajo -> Factura -- para que el usuario vea de un vistazo en que va el
// trabajo (falta el reporte? ya se facturo?) y salte a cualquiera de esos
// documentos. Es de solo lectura: no crea ni modifica nada.
//
// Una cotizacion con varios equipos genera una orden por equipo (ver CLAUDE.md),
// asi que su flujo es un arbol: 1 cotizacion -> N ordenes, cada una con su propio
// reporte y factura (o sin ellos todavia). El flujo de una Orden/Reporte/Factura
// puntual es ese mismo arbol pero recortado a una sola rama (la de esa orden), asi
// el frontend usa un solo componente sin importar desde cual de las 4 pantallas
// se abrio el mapa -- `viewing` le dice cual de los nodos es "donde estas parado".
import * as quoteRepository from '../repositories/quoteRepository.js';
import * as workOrderRepository from '../repositories/workOrderRepository.js';
import * as workReportRepository from '../repositories/workReportRepository.js';
import * as invoiceRepository from '../repositories/invoiceRepository.js';
import { ApiError } from '../utils/ApiError.js';

// Da forma al nodo "cotizacion" del arbol con solo lo que hace falta pintar en
// el mapa (numero, estado, cliente, total) -- no todo `quote` (que trae items,
// equipment_data, etc.)
function toQuoteNode(quote) {
  return {
    id: quote.id,
    number: quote.number,
    status: quote.status,
    client_name: quote.client_name,
    total: quote.total,
  };
}

// Igual que toQuoteNode, pero para una orden de trabajo: le anida su reporte y su
// factura (o null si todavia no los tiene) usando las columnas que ya trae el JOIN
// de workOrderRepository (FLOW_STATUS_SELECT), sin consultas aparte.
function toOrderNode(order) {
  return {
    id: order.id,
    number: order.number,
    status: order.status,
    flow_type: order.flow_type,
    client_name: order.client_name,
    equipment_name: order.equipment_name,
    // Lo necesita WorkOrderDocumentsModal (que el mapa abre para esta orden)
    // para saber si ya se marco la revision de documentos previos a facturar.
    documents_reviewed_at: order.documents_reviewed_at,
    report: order.report_id
      ? { id: order.report_id, number: order.report_number, status: order.report_status }
      : null,
    invoice: order.invoice_id
      ? { id: order.invoice_id, number: order.invoice_number, status: order.invoice_status }
      : null,
  };
}

/**
 * Flujo completo de una cotizacion: ella misma y todas las ordenes de trabajo que
 * genero (puede ser ninguna todavia, una, o varias si tenia varios equipos), cada
 * una con su reporte y su factura si ya los tienen.
 */
export async function getForQuote(quoteId) {
  const quote = await quoteRepository.findById(quoteId);
  if (!quote) throw new ApiError(404, 'Cotizacion no encontrada');
  const orders = await workOrderRepository.findByQuoteId(quoteId);
  return {
    viewing: { type: 'quote', id: quote.id },
    quote: toQuoteNode(quote),
    orders: orders.map(toOrderNode),
  };
}

/**
 * Flujo completo de una orden de trabajo: la cotizacion de la que nacio (si vino
 * de una -- una orden se puede crear tambien sin cotizacion de origen), la orden
 * misma, y su reporte/factura si ya los tiene.
 */
export async function getForWorkOrder(workOrderId) {
  const order = await workOrderRepository.findById(workOrderId);
  if (!order) throw new ApiError(404, 'Orden de trabajo no encontrada');
  const quote = order.quote_id ? await quoteRepository.findById(order.quote_id) : null;
  return {
    viewing: { type: 'work_order', id: order.id },
    quote: quote ? toQuoteNode(quote) : null,
    orders: [toOrderNode(order)],
  };
}

/**
 * Flujo completo de un reporte de trabajo: se resuelve a la orden de trabajo que
 * documenta y se reusa getForWorkOrder, solo cambiando cual nodo queda marcado
 * como "donde estas parado". Un reporte de Orden de Servicio (subcontrato/visita
 * de campo) no documenta una orden de trabajo -- nunca tiene cotizacion ni
 * factura detras (ver CLAUDE.md) -- asi que para esos no hay mapa que mostrar.
 */
export async function getForWorkReport(reportId) {
  const report = await workReportRepository.findById(reportId);
  if (!report) throw new ApiError(404, 'Reporte de trabajo no encontrado');
  if (!report.work_order_id) {
    throw new ApiError(400, 'Este reporte documenta una Orden de Servicio: no tiene cotizacion ni factura asociadas.');
  }
  const flow = await getForWorkOrder(report.work_order_id);
  return { ...flow, viewing: { type: 'work_report', id: report.id } };
}

/**
 * Flujo completo de una factura: igual que getForWorkReport, se resuelve a la
 * orden de trabajo (toda factura tiene una, es NOT NULL) y se reusa
 * getForWorkOrder.
 */
export async function getForInvoice(invoiceId) {
  const invoice = await invoiceRepository.findById(invoiceId);
  if (!invoice) throw new ApiError(404, 'Factura no encontrada');
  const flow = await getForWorkOrder(invoice.work_order_id);
  return { ...flow, viewing: { type: 'invoice', id: invoice.id } };
}
