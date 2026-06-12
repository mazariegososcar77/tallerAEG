import * as loyaltyTierRepository from '../repositories/loyaltyTierRepository.js';
import { ApiError } from '../utils/ApiError.js';

export async function list() {
  return loyaltyTierRepository.getAll();
}
export async function getById(id) {
  const lt = await loyaltyTierRepository.findById(id);
  if (!lt) throw new ApiError(404, 'Nivel de fidelidad no encontrado');
  return lt;
}
export async function create(data) {
  return loyaltyTierRepository.create(data);
}
export async function update(id, patch) {
  const existing = await loyaltyTierRepository.findById(id);
  if (!existing) throw new ApiError(404, 'Nivel de fidelidad no encontrado');
  return loyaltyTierRepository.update(id, patch);
}
export async function remove(id) {
  const existing = await loyaltyTierRepository.findById(id);
  if (!existing) throw new ApiError(404, 'Nivel de fidelidad no encontrado');
  return loyaltyTierRepository.remove(id);
}
