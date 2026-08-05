// Este archivo maneja las ORDENES DE TRABAJO: la ficha del equipo que el cliente
// dejo en el taller (marca, modelo, serie, datos electricos), las piezas/items que
// lleva, los tecnicos asignados y su estado (recibido -> en_proceso -> listo ->
// entregado, o cancelado). Es el segundo paso del flujo del taller, despues de la
// Cotizacion y antes del Reporte de Trabajo.
import * as workOrderRepository from '../repositories/workOrderRepository.js';
import { ApiError } from '../utils/ApiError.js';

// Devuelve la lista completa de ordenes de trabajo.
export async function list() {
  return workOrderRepository.getAll();
}

// Busca una orden de trabajo por id. Si no existe, avisa con un error.
export async function getById(id) {
  const order = await workOrderRepository.findById(id);
  if (!order) throw new ApiError(404, 'Orden de trabajo no encontrada');
  return order;
}

// Convierte a "sin dato" los 4 campos nuevos del flujo Post (precio de torno,
// precio estimado de repuestos, articulo de mano de obra elegido y su precio)
// cuando llegan vacios -- igual que ya se hace con kw/rpm/hp, para que MySQL no
// reciba texto vacio en columnas numericas.
function normalizePostPricing(data) {
  if (data.torno_price === '') data.torno_price = null;
  if (data.parts_price === '') data.parts_price = null;
  if (data.labor_article_id === '' || data.labor_article_id === undefined) data.labor_article_id = null;
  if (data.labor_price === '') data.labor_price = null;
}

// Convierte a "sin dato" los campos nuevos del talonario (029_work_orders_paper_form.sql)
// cuando llegan vacios: next_service_at es DATE (igual que received_at/delivery_at, MySQL
// rechaza '' con ER_TRUNCATED_WRONG_VALUE) y pump_seal_type es ENUM (MySQL tambien rechaza
// '' porque no es un valor valido de la lista, a diferencia de un VARCHAR/TEXT/JSON comun).
function normalizePaperForm(data) {
  if (data.next_service_at === '') data.next_service_at = null;
  if (data.pump_seal_type === '') data.pump_seal_type = null;
}

// Crea una orden de trabajo nueva: le asigna el siguiente numero correlativo y
// convierte los campos opcionales que llegan vacios (total, datos electricos del
// equipo, cotizacion de origen, fechas de recibido/entrega) en "sin dato", porque
// la base de datos rechaza fechas vacias con un error confuso si se le manda texto
// vacio en vez de "sin dato". Si no llega flow_type, MySQL lo deja en 'pre' solo
// (es el default de la columna, ver 025_work_orders_flow_pricing.sql).
export async function create({ items, ...data }) {
  const number = await workOrderRepository.getNextNumber();
  if (data.total === '' || data.total === null || data.total === undefined) data.total = 0;
  if (data.kw === '') data.kw = null;
  if (data.rpm === '') data.rpm = null;
  if (data.hp === '') data.hp = null;
  if (data.quote_id === '' || data.quote_id === undefined) data.quote_id = null;
  if (data.machine_id === '' || data.machine_id === undefined) data.machine_id = null;
  if (data.received_at === '') data.received_at = null;
  if (data.delivery_at === '') data.delivery_at = null;
  normalizePostPricing(data);
  normalizePaperForm(data);
  return workOrderRepository.create({ ...data, number }, items);
}

// Edita una orden de trabajo existente, con la misma limpieza de fechas/cotizacion
// vacias que al crear. Tambien se descartan client_name (no es una columna real),
// created_at/updated_at (fechas que MySQL controla solas; reenviarlas tal como las
// mando el servidor rompe el guardado por el formato) y report_id/report_status/
// quote_status/invoice_id/invoice_status (columnas derivadas que el repositorio
// agrega por JOIN solo para lectura -- ver FLOW_STATUS_SELECT en workOrderRepository
// -- reenviarlas rompe el UPDATE porque no existen en la tabla work_orders).
export async function update(id, { items, client_name, created_at, updated_at,
  report_id, report_status, quote_status, invoice_id, invoice_status, ...data }) {
  const existing = await workOrderRepository.findById(id);
  if (!existing) throw new ApiError(404, 'Orden de trabajo no encontrada');
  if (data.quote_id === '') data.quote_id = null;
  if (data.machine_id === '') data.machine_id = null;
  if (data.received_at === '') data.received_at = null;
  if (data.delivery_at === '') data.delivery_at = null;
  normalizePostPricing(data);
  normalizePaperForm(data);
  return workOrderRepository.update(id, data, items);
}

// Cambia solo el estado de una orden (ej. de "recibido" a "en_proceso").
export async function updateStatus(id, status) {
  const existing = await workOrderRepository.findById(id);
  if (!existing) throw new ApiError(404, 'Orden de trabajo no encontrada');
  return workOrderRepository.update(id, { status });
}

// Elimina una orden de trabajo.
export async function remove(id) {
  const existing = await workOrderRepository.findById(id);
  if (!existing) throw new ApiError(404, 'Orden de trabajo no encontrada');
  return workOrderRepository.remove(id);
}
