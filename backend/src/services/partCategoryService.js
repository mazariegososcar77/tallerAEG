import * as partCategoryRepository from '../repositories/partCategoryRepository.js';
import { ApiError } from '../utils/ApiError.js';

export async function list() {
  return partCategoryRepository.getAll();
}

export async function getById(id) {
  const cat = await partCategoryRepository.findById(id);
  if (!cat) throw new ApiError(404, 'Categoria no encontrada');
  return cat;
}

export async function getNextCode(prefix) {
  return partCategoryRepository.getNextCode(prefix);
}

export async function create(data) {
  return partCategoryRepository.create(data);
}

export async function update(id, data) {
  const existing = await partCategoryRepository.findById(id);
  if (!existing) throw new ApiError(404, 'Categoria no encontrada');
  return partCategoryRepository.update(id, data);
}

export async function remove(id) {
  const existing = await partCategoryRepository.findById(id);
  if (!existing) throw new ApiError(404, 'Categoria no encontrada');
  return partCategoryRepository.remove(id);
}
