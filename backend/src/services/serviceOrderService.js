// Este archivo maneja las ÓRDENES DE SERVICIO: trabajos subcontratados fuera del taller
// (ej. torneado). Es el segundo paso del flujo de subcontratos, despues de registrar al
// subcontratista, y antes de su Reporte de Trabajo (mismo modulo fotografico que ya usan
// las ordenes internas).
import * as serviceOrderRepository from '../repositories/serviceOrderRepository.js';
import { ApiError } from '../utils/ApiError.js';

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
// los campos opcionales que llegan vacios (cliente/orden de origen, fechas, costos) en
// "sin dato", porque la base de datos rechaza fechas/numeros vacios con un error confuso
// si se les manda texto vacio en vez de "sin dato".
export async function create(data) {
  const number = await serviceOrderRepository.getNextNumber();
  if (data.client_id === '') data.client_id = null;
  if (data.work_order_id === '') data.work_order_id = null;
  if (data.expected_return_at === '') data.expected_return_at = null;
  if (data.received_at === '') data.received_at = null;
  if (data.agreed_cost === '') data.agreed_cost = null;
  if (data.actual_cost === '') data.actual_cost = null;
  return serviceOrderRepository.create({ ...data, number });
}

// Edita una orden de servicio existente, con la misma limpieza de vacios que al crear.
// Se descartan subcontractor_name/client_name (no son columnas reales, las agrega el
// repositorio solo para mostrarlas) y created_at/updated_at (fechas que MySQL controla
// solas; reenviarlas tal como las mando el servidor rompe el guardado por el formato).
export async function update(id, { subcontractor_name, client_name, created_at, updated_at, ...data }) {
  const existing = await serviceOrderRepository.findById(id);
  if (!existing) throw new ApiError(404, 'Orden de servicio no encontrada');
  if (data.client_id === '') data.client_id = null;
  if (data.work_order_id === '') data.work_order_id = null;
  if (data.expected_return_at === '') data.expected_return_at = null;
  if (data.received_at === '') data.received_at = null;
  if (data.agreed_cost === '') data.agreed_cost = null;
  if (data.actual_cost === '') data.actual_cost = null;
  return serviceOrderRepository.update(id, data);
}

// Cambia solo el estado de una orden de servicio (ej. de "enviada" a "en_proceso").
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
