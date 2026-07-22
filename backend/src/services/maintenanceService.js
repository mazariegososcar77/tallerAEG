// Este archivo maneja los MANTENIMIENTOS PROGRAMADOS de las maquinas: cada cuanto
// toca darle servicio a un equipo (frecuencia), cuando fue el ultimo, cuando es el
// proximo, y si esta al dia, proximo a vencer o vencido.
import * as maintenanceRepository from '../repositories/maintenanceRepository.js';
import { ApiError } from '../utils/ApiError.js';

// Devuelve los mantenimientos; si se indica clientId, solo los de las maquinas de
// ese cliente.
export async function list(clientId) { return maintenanceRepository.getAll(clientId); }
// Busca un mantenimiento por id. Si no existe, avisa con un error.
export async function getById(id) {
  const m = await maintenanceRepository.findById(id);
  if (!m) throw new ApiError(404, 'Mantenimiento no encontrado');
  return m;
}
// Programa un mantenimiento nuevo para una maquina. Si no se indica cada cuantos
// dias se repite, o la descripcion viene vacia, se guardan como "sin dato".
export async function create(data) {
  if (data.frequency_days === '' || data.frequency_days === undefined) data.frequency_days = null;
  if (data.description === '') data.description = null;
  return maintenanceRepository.create(data);
}
// Edita un mantenimiento programado existente.
export async function update(id, patch) {
  if (!await maintenanceRepository.findById(id)) throw new ApiError(404, 'Mantenimiento no encontrado');
  return maintenanceRepository.update(id, patch);
}
// Elimina un mantenimiento programado.
export async function remove(id) {
  if (!await maintenanceRepository.findById(id)) throw new ApiError(404, 'Mantenimiento no encontrado');
  return maintenanceRepository.remove(id);
}
// Devuelve los mantenimientos que estan por vencer dentro de los proximos "days" dias
// (para avisar al taller con anticipacion que hay que agendar el servicio).
export async function getUpcoming(days) { return maintenanceRepository.getUpcoming(days); }
