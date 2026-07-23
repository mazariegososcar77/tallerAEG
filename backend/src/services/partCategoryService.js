// Este archivo maneja las CATEGORIAS DE PIEZA: el catalogo configurable que
// clasifica los repuestos usados en cotizaciones (ej. "Rodamiento", "Bobina"), cada
// una con un prefijo usado para generar codigos automaticos de pieza.
import * as partCategoryRepository from '../repositories/partCategoryRepository.js';
import { ApiError } from '../utils/ApiError.js';

// Devuelve todas las categorias de pieza del catalogo.
export async function list() {
  return partCategoryRepository.getAll();
}

// Busca una categoria de pieza por id. Si no existe, avisa con un error.
export async function getById(id) {
  const cat = await partCategoryRepository.findById(id);
  if (!cat) throw new ApiError(404, 'Categoria no encontrada');
  return cat;
}

// Calcula el siguiente codigo disponible para una categoria, a partir de su
// prefijo (ej. si el prefijo es "ROD" y ya existe ROD-001, devuelve ROD-002).
export async function getNextCode(prefix) {
  return partCategoryRepository.getNextCode(prefix);
}

// Crea una categoria de pieza nueva.
export async function create(data) {
  return partCategoryRepository.create(data);
}

// Edita una categoria de pieza existente.
export async function update(id, data) {
  const existing = await partCategoryRepository.findById(id);
  if (!existing) throw new ApiError(404, 'Categoria no encontrada');
  return partCategoryRepository.update(id, data);
}

// Elimina una categoria de pieza.
export async function remove(id) {
  const existing = await partCategoryRepository.findById(id);
  if (!existing) throw new ApiError(404, 'Categoria no encontrada');
  return partCategoryRepository.remove(id);
}
