// Este archivo maneja las ÓRDENES DE SERVICIO: el formato de VISITA TÉCNICA DE CAMPO
// (servicio de bombas/pozos en el sitio del cliente) que reemplaza el papel que usaba el
// taller — datos del cliente, mediciones eléctricas, condiciones del equipo, componentes,
// especificaciones, reporte técnico y firmas del técnico y del cliente.
import crypto from 'crypto';
import * as serviceOrderRepository from '../repositories/serviceOrderRepository.js';
import { ApiError } from '../utils/ApiError.js';

// Campos de fecha/hora opcionales: si llegan vacios ('') se guardan como "sin dato", porque
// la base de datos rechaza texto vacio en columnas DATE/TIME con un error confuso.
const OPTIONAL_DATE_TIME_FIELDS = ['visit_time', 'arrival_time', 'departure_time'];

function normalize(data) {
  if (data.client_id === '') data.client_id = null;
  if (data.work_order_id === '') data.work_order_id = null;
  if (data.machine_id === '') data.machine_id = null;
  for (const field of OPTIONAL_DATE_TIME_FIELDS) {
    if (data[field] === '') data[field] = null;
  }
  // well_type es ENUM('sumergible','centrifuga'): MySQL rechaza '' porque no es
  // un valor valido de la lista (mismo patron que pump_seal_type en Ordenes de
  // Trabajo -- ver 029_work_orders_paper_form.sql).
  if (data.well_type === '') data.well_type = null;
}

// Devuelve la lista completa de ordenes de servicio.
export async function list() {
  return serviceOrderRepository.getAll();
}

// Busca una orden de servicio por id. Si no existe, avisa con un error.
export async function getById(id) {
  const order = await serviceOrderRepository.findById(id);
  if (!order) throw new ApiError(404, 'Orden de servicio no encontrada');
  return order;
}

// Crea una orden de servicio nueva: le asigna el siguiente numero correlativo y convierte
// los campos opcionales que llegan vacios en "sin dato".
export async function create(data) {
  const number = await serviceOrderRepository.getNextNumber();
  normalize(data);
  return serviceOrderRepository.create({ ...data, number });
}

// Edita una orden de servicio existente, con la misma limpieza de vacios que al crear.
// Se descartan client_name (no es una columna real, la agrega el repositorio solo para
// mostrarla) y created_at/updated_at (fechas que MySQL controla solas; reenviarlas tal
// como las mando el servidor rompe el guardado por el formato).
export async function update(id, { client_name, created_at, updated_at, ...data }) {
  const existing = await serviceOrderRepository.findById(id);
  if (!existing) throw new ApiError(404, 'Orden de servicio no encontrada');
  normalize(data);
  return serviceOrderRepository.update(id, data);
}

// Cambia solo el estado de una orden de servicio (ej. de "programada" a "en_proceso").
export async function updateStatus(id, status) {
  const existing = await serviceOrderRepository.findById(id);
  if (!existing) throw new ApiError(404, 'Orden de servicio no encontrada');
  return serviceOrderRepository.update(id, { status });
}

// Elimina una orden de servicio.
export async function remove(id) {
  const existing = await serviceOrderRepository.findById(id);
  if (!existing) throw new ApiError(404, 'Orden de servicio no encontrada');
  return serviceOrderRepository.remove(id);
}

// Guarda la firma (dibujada a mano y convertida a imagen) del tecnico o del cliente en la
// orden. Mismo patron que workReportService.setSignature.
export async function setSignature(id, role, name, file) {
  const order = await serviceOrderRepository.findById(id);
  if (!order) throw new ApiError(404, 'Orden de servicio no encontrada');
  if (!['tech', 'client'].includes(role)) throw new ApiError(400, 'Rol de firma invalido');
  if (!file) throw new ApiError(400, 'No se recibio la firma');
  const url = '/uploads/' + file.filename;
  const data = role === 'tech'
    ? { tech_signature_url: url, tech_signature_name: name || null }
    : { client_signature_url: url, client_signature_name: name || null };
  return serviceOrderRepository.update(id, data);
}

/**
 * Genera (o devuelve, si ya existia) el token del enlace publico de firma remota de esta
 * orden -- lo usa el tecnico cuando el cliente no puede firmar en el momento en la app,
 * para que firme "Recibido"/conformidad desde su propio telefono sin iniciar sesion.
 * Mismo mecanismo que workReportService.getSigningLink.
 */
export async function getSigningLink(id) {
  const order = await serviceOrderRepository.findById(id);
  if (!order) throw new ApiError(404, 'Orden de servicio no encontrada');
  if (order.client_signature_token) return order.client_signature_token;
  const token = crypto.randomBytes(24).toString('base64url');
  await serviceOrderRepository.update(id, { client_signature_token: token });
  return token;
}

// Version publica (sin sesion) para la pantalla que abre el cliente desde el enlace de
// firma remota. Devuelve solo lo necesario para esa pantalla.
export async function getPublicByToken(token) {
  const order = await serviceOrderRepository.findByPublicToken(token);
  if (!order) throw new ApiError(404, 'Enlace invalido o vencido');
  return {
    number: order.number,
    equipment_name: order.equipment_name,
    client_name: order.client_name,
    already_signed: Boolean(order.client_signature_url),
    client_signature_url: order.client_signature_url,
    client_signature_name: order.client_signature_name,
  };
}

// Guarda la firma del cliente desde el enlace publico (sin sesion): resuelve la orden a
// partir del token y reutiliza setSignature.
export async function setPublicClientSignature(token, name, file) {
  const order = await serviceOrderRepository.findByPublicToken(token);
  if (!order) throw new ApiError(404, 'Enlace invalido o vencido');
  return setSignature(order.id, 'client', name, file);
}
