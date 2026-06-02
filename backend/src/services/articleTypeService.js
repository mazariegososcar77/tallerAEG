/** Logica de negocio de tipos de articulo (CRUD). */
import * as articleTypeRepository from '../repositories/articleTypeRepository.js';
import * as articleRepository from '../repositories/articleRepository.js';
import { ApiError } from '../utils/ApiError.js';

export function list() {
  return articleTypeRepository.getAll();
}

export function getById(id) {
  const type = articleTypeRepository.findById(id);
  if (!type) throw new ApiError(404, 'Tipo de articulo no encontrado');
  return type;
}

export function create({ name, description = '', is_active = true }) {
  if (articleTypeRepository.findByName(name)) {
    throw new ApiError(409, 'Ya existe un tipo con ese nombre');
  }
  return articleTypeRepository.create({ name, description, is_active });
}

export function update(id, { name, description, is_active }) {
  const existing = articleTypeRepository.findById(id);
  if (!existing) throw new ApiError(404, 'Tipo de articulo no encontrado');
  if (name && name.trim().toLowerCase() !== existing.name.toLowerCase()) {
    const clash = articleTypeRepository.findByName(name);
    if (clash && clash.id !== existing.id) {
      throw new ApiError(409, 'Ya existe un tipo con ese nombre');
    }
  }
  const patch = {};
  if (name !== undefined) patch.name = name.trim();
  if (description !== undefined) patch.description = description;
  if (is_active !== undefined) patch.is_active = is_active;
  return articleTypeRepository.update(id, patch);
}

export function remove(id) {
  if (!articleTypeRepository.findById(id)) throw new ApiError(404, 'Tipo de articulo no encontrado');
  if (articleRepository.countByTypeId(id) > 0) {
    throw new ApiError(409, 'No se puede eliminar: hay articulos de este tipo');
  }
  articleTypeRepository.remove(id);
}
