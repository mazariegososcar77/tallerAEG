// Este archivo maneja las COTIZACIONES: el primer paso del flujo del taller
// (Cotizacion -> Orden de Trabajo -> Reporte de Trabajo -> Factura). Aqui se
// calcula automaticamente el subtotal y el total de la cotizacion a partir de
// las piezas/mano de obra que se agregan, con su cantidad, precio y descuento.
import * as quoteRepository from '../repositories/quoteRepository.js';
import * as workOrderRepository from '../repositories/workOrderRepository.js';
import * as notificationRepository from '../repositories/notificationRepository.js';
import * as numberingService from './numberingService.js';
import * as settingsService from './settingsService.js';
import { ApiError } from '../utils/ApiError.js';

// A que estados se puede pasar a mano desde cada uno (un solo sentido -- ver updateStatus).
// "vencida" no aparece en ningun lado: nadie la pone a mano, la asigna sola expireOverdue().
const ALLOWED_TRANSITIONS = {
  borrador: ['enviada'],
  enviada: ['aprobada', 'rechazada'],
};

/**
 * La regla de "quien puede pasar a quien", separada de la base de datos para poder
 * probarla sola. No devuelve nada: si la transicion no esta permitida, lanza el ApiError
 * con el mensaje que ve el usuario (400 o 403 segun el caso).
 */
export function assertValidTransition(current, target, canReset) {
  if (target === current) return; // nada que hacer
  if (target === 'vencida') {
    throw new ApiError(400, 'El estado "Vencida" lo asigna el sistema solo, segun la fecha de vigencia. No se puede poner a mano.');
  }
  if (target === 'borrador') {
    if (!canReset) throw new ApiError(403, 'Solo un administrador puede reiniciar una cotización a Borrador.');
    return;
  }
  if (!(ALLOWED_TRANSITIONS[current] || []).includes(target)) {
    throw new ApiError(400, `No se puede pasar una cotización de "${current}" a "${target}".`);
  }
}

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

// Descarta lineas sin descripcion (filas que el formulario deja en blanco por
// defecto y el usuario nunca lleno). Se guardan como si nunca se hubieran
// agregado -- pasarlas tal cual con descripcion "" no rompe el guardado (la
// columna solo exige NOT NULL, un string vacio cumple), pero mas adelante
// rompe la certificacion FEL: Digifact rechaza el NUC completo si algun item
// no tiene Description ("No se encuentra el elemento Description en Item").
function dropBlankItems(items) {
  return (items || []).filter((i) => (i.description || '').trim().length > 0);
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
//
// work_order_id (opcional, flujo Post): cuando la cotizacion se crea DESDE una
// orden de trabajo (en vez de al reves, como en Pre), se usa solo para enlazar
// de vuelta esa orden con la cotizacion recien creada (work_orders.quote_id) —
// no es una columna de "quotes", asi que se separa del resto del payload antes
// de guardar.
export async function create({ items, work_order_id, client_name, client_contacts, ...data }) {
  const number = await numberingService.getNextNumber('quote');
  normalize(data);
  items = dropBlankItems(items);
  if (items.length > 0) {
    const { subtotal, total } = calcTotals(items, data.discount);
    data.subtotal = subtotal;
    data.total = total;
  }
  const quote = await quoteRepository.create({ ...data, number }, items);
  if (work_order_id) {
    await workOrderRepository.update(work_order_id, { quote_id: quote.id });
  }
  return quote;
}

// Edita una cotizacion existente, recalculando subtotal/total igual que al crear.
// Se descartan client_name y client_contacts (no son columnas reales, las agrega el
// repositorio por JOIN/subconsulta solo para mostrarlas -- client_contacts lo usa la
// pantalla para proponer a quien mandarle la cotizacion) y created_at/updated_at
// (fechas que MySQL controla solas; si el formulario las reenvia tal como las mando
// el servidor, rompen el guardado porque no vienen en el formato que espera la base).
export async function update(id, { items, client_name, client_contacts, created_at, updated_at, ...data }) {
  const existing = await quoteRepository.findById(id);
  if (!existing) throw new ApiError(404, 'Cotización no encontrada');
  normalize(data);
  // `items === undefined` significa "no tocar las lineas" (ver workOrderRepository.update);
  // solo se filtran las vacias cuando SI vienen lineas nuevas para guardar.
  if (items !== undefined) items = dropBlankItems(items);
  if (items && items.length > 0) {
    const { subtotal, total } = calcTotals(items, data.discount);
    data.subtotal = subtotal;
    data.total = total;
  }
  return quoteRepository.update(id, data, items);
}

/**
 * Cambia el estado de una cotizacion, pero solo en el sentido permitido: Borrador ->
 * Enviada -> Aprobada/Rechazada (ver ALLOWED_TRANSITIONS). Es lo que usan los clics de la
 * tarjeta de la lista -- ya no hay un selector libre adentro de la cotizacion.
 *
 * "vencida" nunca se acepta aqui: la pone sola expireOverdue() segun la fecha, nadie la
 * elige a mano. Volver a "borrador" desde cualquier otro estado (el "deshacer todo") es la
 * unica excepcion a sentido unico, y por eso exige `canReset` -- el controller lo arma a
 * partir del permiso `quotes.reset-status` del usuario (Administrador por defecto, mismo
 * criterio que `work-reports.force-edit`).
 */
export async function updateStatus(id, status, { canReset = false } = {}) {
  const existing = await quoteRepository.findById(id);
  if (!existing) throw new ApiError(404, 'Cotización no encontrada');
  assertValidTransition(existing.status, status, canReset);
  if (status === existing.status) return existing; // nada que hacer
  return quoteRepository.update(id, { status });
}

/**
 * Pasa a "vencida" toda cotizacion que ya se paso de fecha sin que nadie la aprobara ni
 * rechazara. La llama notificationScheduler en cada vuelta del reloj (ver ese archivo).
 */
export async function expireOverdue() {
  return quoteRepository.markExpired();
}

/**
 * Las cotizaciones que vencen pronto (dentro de los dias configurados en Configuracion >
 * Notificaciones > "Cotizaciones por vencer") y todavia siguen en "enviada" -- es la misma
 * consulta que ya usa el correo automatico de ese aviso, reusada aqui para la alerta del
 * Dashboard (mismo criterio de "cuales importan", un solo lugar para configurar cuantos
 * dias de anticipacion).
 */
export async function expiringSoon() {
  const settings = await settingsService.getSettings();
  return notificationRepository.expiringQuotes(Number(settings.notif_quote_expiring_days) || 3);
}

/**
 * Duplica cualquier cotizacion (sin importar su estado): crea una cotizacion nueva,
 * identica (cliente, equipos, piezas/mano de obra con sus precios, descuento,
 * observaciones), en Borrador, con el siguiente numero correlativo, fecha de hoy y la
 * vigencia por defecto de Configuracion general -- lista para ajustar y reenviar, en vez
 * de reabrir precios/condiciones de la original. `duplicated_from_id` deja el enlace para
 * que el Mapa de Relaciones muestre las dos cotizaciones conectadas (ver
 * documentFlowService.getForQuote).
 */
export async function duplicate(id) {
  const original = await quoteRepository.findById(id);
  if (!original) throw new ApiError(404, 'Cotización no encontrada');

  const settings = await settingsService.getSettings();
  const today = new Date();
  const validUntil = new Date(today);
  validUntil.setDate(validUntil.getDate() + Number(settings.quote_valid_days || 15));

  const items = (original.items || []).map(({ equipment_index, item_type, description, quantity, unit_price }) => ({
    equipment_index, item_type, description, quantity, unit_price,
  }));
  const { subtotal, total } = calcTotals(items, original.discount);

  const number = await numberingService.getNextNumber('quote');
  return quoteRepository.create({
    client_id: original.client_id,
    date: today.toISOString().slice(0, 10),
    valid_until: validUntil.toISOString().slice(0, 10),
    work_type: original.work_type,
    observations: original.observations,
    equipment_data: original.equipment_data,
    discount: original.discount,
    subtotal,
    total,
    status: 'borrador',
    duplicated_from_id: original.id,
    number,
  }, items);
}

// Elimina una cotizacion.
export async function remove(id) {
  const existing = await quoteRepository.findById(id);
  if (!existing) throw new ApiError(404, 'Cotización no encontrada');
  return quoteRepository.remove(id);
}
