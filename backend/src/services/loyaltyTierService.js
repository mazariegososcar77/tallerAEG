/** Logica de negocio de niveles de fidelizacion (CRUD). */
import * as loyaltyTierRepository from '../repositories/loyaltyTierRepository.js';
import * as clientRepository from '../repositories/clientRepository.js';
import { ApiError } from '../utils/ApiError.js';

export function list() {
  return loyaltyTierRepository.getAll();
}

export function getById(id) {
  const tier = loyaltyTierRepository.findById(id);
  if (!tier) throw new ApiError(404, 'Nivel de fidelizacion no encontrado');
  return tier;
}

export function create({ name, discount = 0, benefits = '', color = '#E8551C', icon = 'award', is_active = true }) {
  if (loyaltyTierRepository.findByName(name)) {
    throw new ApiError(409, 'Ya existe un nivel con ese nombre');
  }
  return loyaltyTierRepository.create({ name, discount, benefits, color, icon, is_active });
}

export function update(id, { name, discount, benefits, color, icon, is_active }) {
  const existing = loyaltyTierRepository.findById(id);
  if (!existing) throw new ApiError(404, 'Nivel de fidelizacion no encontrado');
  if (name && name.trim().toLowerCase() !== existing.name.toLowerCase()) {
    const clash = loyaltyTierRepository.findByName(name);
    if (clash && clash.id !== existing.id) {
      throw new ApiError(409, 'Ya existe un nivel con ese nombre');
    }
  }
  const patch = {};
  if (name !== undefined) patch.name = name.trim();
  if (discount !== undefined) patch.discount = Number(discount) || 0;
  if (benefits !== undefined) patch.benefits = benefits;
  if (color !== undefined) patch.color = color;
  if (icon !== undefined) patch.icon = icon;
  if (is_active !== undefined) patch.is_active = is_active;
  return loyaltyTierRepository.update(id, patch);
}

export function remove(id) {
  if (!loyaltyTierRepository.findById(id)) throw new ApiError(404, 'Nivel de fidelizacion no encontrado');
  if (clientRepository.countByLoyaltyTierId(id) > 0) {
    throw new ApiError(409, 'No se puede eliminar: hay clientes con este nivel de fidelizacion');
  }
  loyaltyTierRepository.remove(id);
}
