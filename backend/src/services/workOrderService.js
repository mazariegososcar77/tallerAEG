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

// Crea una orden de trabajo nueva: le asigna el siguiente numero correlativo y
// convierte los campos opcionales que llegan vacios (total, datos electricos del
// equipo, cotizacion de origen, fechas de recibido/entrega) en "sin dato", porque
// la base de datos rechaza fechas vacias con un error confuso si se le manda texto
// vacio en vez de "sin dato".
export async function create({ items, ...data }) {
  const number = await workOrderRepository.getNextNumber();
  if (data.total === '' || data.total === null || data.total === undefined) data.total = 0;
  if (data.kw === '') data.kw = null;
  if (data.rpm === '') data.rpm = null;
  if (data.hp === '') data.hp = null;
  if (data.quote_id === '' || data.quote_id === undefined) data.quote_id = null;
  if (data.received_at === '') data.received_at = null;
  if (data.delivery_at === '') data.delivery_at = null;
  return workOrderRepository.create({ ...data, number }, items);
}

// Edita una orden de trabajo existente, con la misma limpieza de fechas/cotizacion
// vacias que al crear. Tambien se descartan client_name (no es una columna real) y
// created_at/updated_at (fechas que MySQL controla solas; reenviarlas tal como las
// mando el servidor rompe el guardado por el formato).
export async function update(id, { items, client_name, created_at, updated_at, ...data }) {
  const existing = await workOrderRepository.findById(id);
  if (!existing) throw new ApiError(404, 'Orden de trabajo no encontrada');
  if (data.quote_id === '') data.quote_id = null;
  if (data.received_at === '') data.received_at = null;
  if (data.delivery_at === '') data.delivery_at = null;
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
