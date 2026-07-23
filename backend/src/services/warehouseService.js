// Este archivo maneja las BODEGAS: el catalogo configurable de lugares fisicos
// donde se guardan los articulos del inventario. Se administra desde Configuracion.
import * as warehouseRepository from '../repositories/warehouseRepository.js';
import { ApiError } from '../utils/ApiError.js';

// Devuelve todas las bodegas.
export async function list() {
  return warehouseRepository.getAll();
}
// Busca una bodega por id. Si no existe, avisa con un error.
export async function getById(id) {
  const w = await warehouseRepository.findById(id);
  if (!w) throw new ApiError(404, 'Bodega no encontrada');
  return w;
}
// Crea una bodega nueva.
export async function create(data) {
  return warehouseRepository.create(data);
}
// Edita una bodega existente.
export async function update(id, patch) {
  const existing = await warehouseRepository.findById(id);
  if (!existing) throw new ApiError(404, 'Bodega no encontrada');
  return warehouseRepository.update(id, patch);
}
// Elimina una bodega. (El repositorio bloquea el borrado si todavia hay articulos
// guardados ahi.)
export async function remove(id) {
  const existing = await warehouseRepository.findById(id);
  if (!existing) throw new ApiError(404, 'Bodega no encontrada');
  return warehouseRepository.remove(id);
}
