import * as articleTypeRepository from '../repositories/articleTypeRepository.js';
import { ApiError } from '../utils/ApiError.js';

export async function list() {
  return articleTypeRepository.getAll();
}
export async function getById(id) {
  const at = await articleTypeRepository.findById(id);
  if (!at) throw new ApiError(404, 'Tipo de articulo no encontrado');
  return at;
}
export async function create(data) {
  return articleTypeRepository.create(data);
}
export async function update(id, patch) {
  const existing = await articleTypeRepository.findById(id);
  if (!existing) throw new ApiError(404, 'Tipo de articulo no encontrado');
  return articleTypeRepository.update(id, patch);
}
export async function remove(id) {
  const existing = await articleTypeRepository.findById(id);
  if (!existing) throw new ApiError(404, 'Tipo de articulo no encontrado');
  return articleTypeRepository.remove(id);
}
