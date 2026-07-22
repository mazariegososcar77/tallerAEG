// Este archivo maneja los NIVELES DE FIDELIZACION: el catalogo configurable de
// niveles de cliente frecuente (ej. "Oro", "Plata"), cada uno con su descuento,
// beneficios, color e icono para mostrarlo en pantalla. Se administra desde
// Configuracion.
import * as loyaltyTierRepository from '../repositories/loyaltyTierRepository.js';
import { ApiError } from '../utils/ApiError.js';

// Devuelve todos los niveles de fidelizacion del catalogo.
export async function list() {
  return loyaltyTierRepository.getAll();
}
// Busca un nivel de fidelizacion por id. Si no existe, avisa con un error.
export async function getById(id) {
  const lt = await loyaltyTierRepository.findById(id);
  if (!lt) throw new ApiError(404, 'Nivel de fidelidad no encontrado');
  return lt;
}
// Crea un nivel de fidelizacion nuevo.
export async function create(data) {
  return loyaltyTierRepository.create(data);
}
// Edita un nivel de fidelizacion existente.
export async function update(id, patch) {
  const existing = await loyaltyTierRepository.findById(id);
  if (!existing) throw new ApiError(404, 'Nivel de fidelidad no encontrado');
  return loyaltyTierRepository.update(id, patch);
}
// Elimina un nivel de fidelizacion. (El repositorio bloquea el borrado si todavia
// hay clientes en ese nivel.)
export async function remove(id) {
  const existing = await loyaltyTierRepository.findById(id);
  if (!existing) throw new ApiError(404, 'Nivel de fidelidad no encontrado');
  return loyaltyTierRepository.remove(id);
}
