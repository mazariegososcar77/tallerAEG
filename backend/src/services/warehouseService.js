/** Logica de negocio de bodegas (CRUD). */
import * as warehouseRepository from '../repositories/warehouseRepository.js';
import * as articleRepository from '../repositories/articleRepository.js';
import { ApiError } from '../utils/ApiError.js';

export function list() {
  return warehouseRepository.getAll();
}

export function getById(id) {
  const warehouse = warehouseRepository.findById(id);
  if (!warehouse) throw new ApiError(404, 'Bodega no encontrada');
  return warehouse;
}

export function create({ name, description = '', color = '#16285C', is_active = true }) {
  if (warehouseRepository.findByName(name)) {
    throw new ApiError(409, 'Ya existe una bodega con ese nombre');
  }
  return warehouseRepository.create({ name, description, color, is_active });
}

export function update(id, { name, description, color, is_active }) {
  const existing = warehouseRepository.findById(id);
  if (!existing) throw new ApiError(404, 'Bodega no encontrada');
  if (name && name.trim().toLowerCase() !== existing.name.toLowerCase()) {
    const clash = warehouseRepository.findByName(name);
    if (clash && clash.id !== existing.id) {
      throw new ApiError(409, 'Ya existe una bodega con ese nombre');
    }
  }
  const patch = {};
  if (name !== undefined) patch.name = name.trim();
  if (description !== undefined) patch.description = description;
  if (color !== undefined) patch.color = color;
  if (is_active !== undefined) patch.is_active = is_active;
  return warehouseRepository.update(id, patch);
}

export function remove(id) {
  if (!warehouseRepository.findById(id)) throw new ApiError(404, 'Bodega no encontrada');
  if (articleRepository.countByWarehouseId(id) > 0) {
    throw new ApiError(409, 'No se puede eliminar: hay articulos en esta bodega');
  }
  warehouseRepository.remove(id);
}
