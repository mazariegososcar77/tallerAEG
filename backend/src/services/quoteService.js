// Este archivo maneja las COTIZACIONES: el primer paso del flujo del taller
// (Cotizacion -> Orden de Trabajo -> Reporte de Trabajo -> Factura). Aqui se
// calcula automaticamente el subtotal y el total de la cotizacion a partir de
// las piezas/mano de obra que se agregan, con su cantidad, precio y descuento.
import * as quoteRepository from '../repositories/quoteRepository.js';
import { ApiError } from '../utils/ApiError.js';

// Limpia los datos de la cotizacion antes de guardarlos: los montos vacios se
// guardan como 0, y los campos de texto opcionales (fecha de vencimiento, tipo de
// trabajo, observaciones, datos del equipo) como "sin dato" si vienen vacios.
function normalize(data) {
  if (data.discount === '' || data.discount === undefined) data.discount = 0;
  if (data.subtotal === '' || data.subtotal === undefined) data.subtotal = 0;
  if (data.total === '' || data.total === undefined) data.total = 0;
  if (data.valid_until === '') data.valid_until = null;
  if (data.work_type === '') data.work_type = null;
  if (data.observations === '') data.observations = null;
  if (data.equipment_data === undefined) data.equipment_data = null;
  return data;
}

// Calcula el subtotal (suma de cantidad x precio de cada item) y el total
// (subtotal menos el descuento) de una cotizacion.
function calcTotals(items, discount) {
  const subtotal = items.reduce((s, i) => s + (parseFloat(i.quantity) || 1) * (parseFloat(i.unit_price) || 0), 0);
  const total = subtotal - (parseFloat(discount) || 0);
  return { subtotal, total };
}

// Devuelve la lista completa de cotizaciones.
export async function list() {
  return quoteRepository.getAll();
}

// Busca una cotizacion por id. Si no existe, avisa con un error.
export async function getById(id) {
  const quote = await quoteRepository.findById(id);
  if (!quote) throw new ApiError(404, 'Cotización no encontrada');
  return quote;
}

// Crea una cotizacion nueva: le asigna el siguiente numero correlativo y, si trae
// items (piezas/mano de obra), recalcula el subtotal y el total antes de guardarla
// (nunca confia en un total que venga ya calculado desde afuera).
export async function create({ items, ...data }) {
  const number = await quoteRepository.getNextNumber();
  normalize(data);
  if (items && items.length > 0) {
    const { subtotal, total } = calcTotals(items, data.discount);
    data.subtotal = subtotal;
    data.total = total;
  }
  return quoteRepository.create({ ...data, number }, items || []);
}

// Edita una cotizacion existente, recalculando subtotal/total igual que al crear.
// Se descartan client_name (no es una columna real, la agrega el repositorio solo
// para mostrarla) y created_at/updated_at (fechas que MySQL controla solas; si el
// formulario las reenvia tal como las mando el servidor, rompen el guardado porque
// no vienen en el formato que la base de datos espera).
export async function update(id, { items, client_name, created_at, updated_at, ...data }) {
  const existing = await quoteRepository.findById(id);
  if (!existing) throw new ApiError(404, 'Cotización no encontrada');
  normalize(data);
  if (items && items.length > 0) {
    const { subtotal, total } = calcTotals(items, data.discount);
    data.subtotal = subtotal;
    data.total = total;
  }
  return quoteRepository.update(id, data, items);
}

// Cambia solo el estado de una cotizacion (ej. de "pendiente" a "aprobada").
export async function updateStatus(id, status) {
  const existing = await quoteRepository.findById(id);
  if (!existing) throw new ApiError(404, 'Cotización no encontrada');
  return quoteRepository.update(id, { status });
}

// Elimina una cotizacion.
export async function remove(id) {
  const existing = await quoteRepository.findById(id);
  if (!existing) throw new ApiError(404, 'Cotización no encontrada');
  return quoteRepository.remove(id);
}
