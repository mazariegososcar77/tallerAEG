// Este archivo maneja los TIPOS DE TRABAJO: el catalogo configurable que alimenta el
// selector "Tipo de trabajo" de Cotizaciones y Ordenes de Trabajo. Se administra desde
// Configuracion. Solo trae/crea/edita/borra tipos; no toca cotizaciones ni ordenes.
import * as workTypeRepository from '../repositories/workTypeRepository.js';
import { ApiError } from '../utils/ApiError.js';

// Devuelve todos los tipos de trabajo del catalogo.
export async function list() {
  return workTypeRepository.getAll();
}
// Busca un tipo de trabajo por id. Si no existe, avisa con un error.
export async function getById(id) {
  const wt = await workTypeRepository.findById(id);
  if (!wt) throw new ApiError(404, 'Tipo de trabajo no encontrado');
  return wt;
}
// Crea un tipo de trabajo nuevo.
export async function create(data) {
  return workTypeRepository.create(data);
}
// Edita un tipo de trabajo existente.
export async function update(id, patch) {
  const existing = await workTypeRepository.findById(id);
  if (!existing) throw new ApiError(404, 'Tipo de trabajo no encontrado');
  return workTypeRepository.update(id, patch);
}
// Elimina un tipo de trabajo.
export async function remove(id) {
  const existing = await workTypeRepository.findById(id);
  if (!existing) throw new ApiError(404, 'Tipo de trabajo no encontrado');
  return workTypeRepository.remove(id);
}
