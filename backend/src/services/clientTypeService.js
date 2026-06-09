/** Logica de negocio de tipos de cliente (CRUD). */
import * as clientTypeRepository from '../repositories/clientTypeRepository.js';
import * as clientRepository from '../repositories/clientRepository.js';
import { ApiError } from '../utils/ApiError.js';

export function list() {
  return clientTypeRepository.getAll();
}

export function getById(id) {
  const type = clientTypeRepository.findById(id);
  if (!type) throw new ApiError(404, 'Tipo de cliente no encontrado');
  return type;
}

export function create({ name, description = '', is_active = true }) {
  if (clientTypeRepository.findByName(name)) {
    throw new ApiError(409, 'Ya existe un tipo de cliente con ese nombre');
  }
  return clientTypeRepository.create({ name, description, is_active });
}

export function update(id, { name, description, is_active }) {
  const existing = clientTypeRepository.findById(id);
  if (!existing) throw new ApiError(404, 'Tipo de cliente no encontrado');
  if (name && name.trim().toLowerCase() !== existing.name.toLowerCase()) {
    const clash = clientTypeRepository.findByName(name);
    if (clash && clash.id !== existing.id) {
      throw new ApiError(409, 'Ya existe un tipo de cliente con ese nombre');
    }
  }
  const patch = {};
  if (name !== undefined) patch.name = name.trim();
  if (description !== undefined) patch.description = description;
  if (is_active !== undefined) patch.is_active = is_active;
  return clientTypeRepository.update(id, patch);
}

export function remove(id) {
  if (!clientTypeRepository.findById(id)) throw new ApiError(404, 'Tipo de cliente no encontrado');
  if (clientRepository.countByTypeId(id) > 0) {
    throw new ApiError(409, 'No se puede eliminar: hay clientes con este tipo');
  }
  clientTypeRepository.remove(id);
}
