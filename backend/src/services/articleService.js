// Este archivo maneja los ARTICULOS del inventario (repuestos, mano de obra, etc.):
// ver la lista, ver el detalle de uno, crear uno nuevo, editarlo o eliminarlo.
// Aqui no se guarda nada directo en la base de datos: eso lo hace articleRepository;
// este archivo solo decide las reglas (por ejemplo, avisar si el articulo no existe).
import * as articleRepository from '../repositories/articleRepository.js';
import { ApiError } from '../utils/ApiError.js';

// Devuelve todos los articulos, o solo los de un tipo si se indica typeId (ej: solo "repuestos").
export async function list(typeId = null) {
  return articleRepository.getAll(typeId);
}
// Busca un articulo por su id. Si no existe, avisa con un error "no encontrado".
export async function getById(id) {
  const a = await articleRepository.findById(id);
  if (!a) throw new ApiError(404, 'Articulo no encontrado');
  return a;
}
// Crea un articulo nuevo con los datos recibidos.
export async function create(data) {
  return articleRepository.create(data);
}
// Edita un articulo existente. Primero confirma que exista, para no editar algo que no esta.
export async function update(id, patch) {
  const existing = await articleRepository.findById(id);
  if (!existing) throw new ApiError(404, 'Articulo no encontrado');
  return articleRepository.update(id, patch);
}
// Elimina un articulo. Primero confirma que exista.
export async function remove(id) {
  const existing = await articleRepository.findById(id);
  if (!existing) throw new ApiError(404, 'Articulo no encontrado');
  return articleRepository.remove(id);
}
