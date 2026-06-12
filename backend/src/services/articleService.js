import * as articleRepository from '../repositories/articleRepository.js';
import { ApiError } from '../utils/ApiError.js';

export async function list(typeId = null) {
  return articleRepository.getAll(typeId);
}
export async function getById(id) {
  const a = await articleRepository.findById(id);
  if (!a) throw new ApiError(404, 'Articulo no encontrado');
  return a;
}
export async function create(data) {
  return articleRepository.create(data);
}
export async function update(id, patch) {
  const existing = await articleRepository.findById(id);
  if (!existing) throw new ApiError(404, 'Articulo no encontrado');
  return articleRepository.update(id, patch);
}
export async function remove(id) {
  const existing = await articleRepository.findById(id);
  if (!existing) throw new ApiError(404, 'Articulo no encontrado');
  return articleRepository.remove(id);
}
