// Este archivo maneja los SUBCONTRATISTAS: el catalogo configurable de terceros a los
// que el taller les manda trabajos afuera. Se administra desde Configuracion.
import * as subcontractorRepository from '../repositories/subcontractorRepository.js';
import { ApiError } from '../utils/ApiError.js';

// Devuelve todos los subcontratistas.
export async function list() {
  return subcontractorRepository.getAll();
}
// Busca un subcontratista por id. Si no existe, avisa con un error.
export async function getById(id) {
  const s = await subcontractorRepository.findById(id);
  if (!s) throw new ApiError(404, 'Subcontratista no encontrado');
  return s;
}
// Crea un subcontratista nuevo.
export async function create(data) {
  return subcontractorRepository.create(data);
}
// Edita un subcontratista existente.
export async function update(id, patch) {
  const existing = await subcontractorRepository.findById(id);
  if (!existing) throw new ApiError(404, 'Subcontratista no encontrado');
  return subcontractorRepository.update(id, patch);
}
// Elimina un subcontratista. (El repositorio bloquea el borrado si todavia tiene
// ordenes de servicio asociadas.)
export async function remove(id) {
  const existing = await subcontractorRepository.findById(id);
  if (!existing) throw new ApiError(404, 'Subcontratista no encontrado');
  return subcontractorRepository.remove(id);
}
