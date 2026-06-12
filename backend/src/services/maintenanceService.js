import * as maintenanceRepository from '../repositories/maintenanceRepository.js';
import { ApiError } from '../utils/ApiError.js';

export async function list(clientId) { return maintenanceRepository.getAll(clientId); }
export async function getById(id) {
  const m = await maintenanceRepository.findById(id);
  if (!m) throw new ApiError(404, 'Mantenimiento no encontrado');
  return m;
}
export async function create(data) {
  if (data.frequency_days === '' || data.frequency_days === undefined) data.frequency_days = null;
  if (data.description === '') data.description = null;
  return maintenanceRepository.create(data);
}
export async function update(id, patch) {
  if (!await maintenanceRepository.findById(id)) throw new ApiError(404, 'Mantenimiento no encontrado');
  return maintenanceRepository.update(id, patch);
}
export async function remove(id) {
  if (!await maintenanceRepository.findById(id)) throw new ApiError(404, 'Mantenimiento no encontrado');
  return maintenanceRepository.remove(id);
}
export async function getUpcoming(days) { return maintenanceRepository.getUpcoming(days); }
