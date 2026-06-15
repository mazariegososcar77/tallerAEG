import * as clientTypeRepository from '../repositories/clientTypeRepository.js';
import { ApiError } from '../utils/ApiError.js';

export async function list() {
  return clientTypeRepository.getAll();
}
export async function getById(id) {
  const ct = await clientTypeRepository.findById(id);
  if (!ct) throw new ApiError(404, 'Tipo de cliente no encontrado');
  return ct;
}
export async function create(data) {
  return clientTypeRepository.create(data);
}
export async function update(id, patch) {
  const existing = await clientTypeRepository.findById(id);
  if (!existing) throw new ApiError(404, 'Tipo de cliente no encontrado');
  return clientTypeRepository.update(id, patch);
}
export async function remove(id) {
  const existing = await clientTypeRepository.findById(id);
  if (!existing) throw new ApiError(404, 'Tipo de cliente no encontrado');
  return clientTypeRepository.remove(id);
}
