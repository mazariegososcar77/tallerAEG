import * as warehouseRepository from '../repositories/warehouseRepository.js';
import { ApiError } from '../utils/ApiError.js';

export async function list() {
  return warehouseRepository.getAll();
}
export async function getById(id) {
  const w = await warehouseRepository.findById(id);
  if (!w) throw new ApiError(404, 'Bodega no encontrada');
  return w;
}
export async function create(data) {
  return warehouseRepository.create(data);
}
export async function update(id, patch) {
  const existing = await warehouseRepository.findById(id);
  if (!existing) throw new ApiError(404, 'Bodega no encontrada');
  return warehouseRepository.update(id, patch);
}
export async function remove(id) {
  const existing = await warehouseRepository.findById(id);
  if (!existing) throw new ApiError(404, 'Bodega no encontrada');
  return warehouseRepository.remove(id);
}
