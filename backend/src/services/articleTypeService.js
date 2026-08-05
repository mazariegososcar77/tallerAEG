// Este archivo maneja los TIPOS DE ARTICULO: el catalogo configurable que clasifica
// los articulos del inventario (por ejemplo "Repuesto", "Mano de obra"). Se administra
// desde Configuracion. Solo trae/crea/edita/borra tipos; no toca los articulos en si.
import * as articleTypeRepository from '../repositories/articleTypeRepository.js';
import { ApiError } from '../utils/ApiError.js';

// Devuelve todos los tipos de articulo del catalogo.
export async function list() {
  return articleTypeRepository.getAll();
}
// Busca un tipo de articulo por id. Si no existe, avisa con un error.
export async function getById(id) {
  const at = await articleTypeRepository.findById(id);
  if (!at) throw new ApiError(404, 'Tipo de articulo no encontrado');
  return at;
}
// Crea un tipo de articulo nuevo.
export async function create(data) {
  return articleTypeRepository.create(data);
}
// Edita un tipo de articulo existente.
export async function update(id, patch) {
  const existing = await articleTypeRepository.findById(id);
  if (!existing) throw new ApiError(404, 'Tipo de articulo no encontrado');
  return articleTypeRepository.update(id, patch);
}
// Elimina un tipo de articulo. (El repositorio bloquea el borrado si todavia hay
// articulos usando este tipo, para no dejar articulos "huerfanos" sin categoria.)
export async function remove(id) {
  const existing = await articleTypeRepository.findById(id);
  if (!existing) throw new ApiError(404, 'Tipo de articulo no encontrado');
  return articleTypeRepository.remove(id);
}
