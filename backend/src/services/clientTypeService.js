// Este archivo maneja los TIPOS DE CLIENTE: el catalogo configurable que clasifica
// a los clientes (por ejemplo "Empresa", "Persona individual"). Se administra desde
// Configuracion.
import * as clientTypeRepository from '../repositories/clientTypeRepository.js';
import { ApiError } from '../utils/ApiError.js';

// Devuelve todos los tipos de cliente del catalogo.
export async function list() {
  return clientTypeRepository.getAll();
}
// Busca un tipo de cliente por id. Si no existe, avisa con un error.
export async function getById(id) {
  const ct = await clientTypeRepository.findById(id);
  if (!ct) throw new ApiError(404, 'Tipo de cliente no encontrado');
  return ct;
}
// Crea un tipo de cliente nuevo.
export async function create(data) {
  return clientTypeRepository.create(data);
}
// Edita un tipo de cliente existente.
export async function update(id, patch) {
  const existing = await clientTypeRepository.findById(id);
  if (!existing) throw new ApiError(404, 'Tipo de cliente no encontrado');
  return clientTypeRepository.update(id, patch);
}
// Elimina un tipo de cliente. (El repositorio bloquea el borrado si todavia hay
// clientes usando este tipo.)
export async function remove(id) {
  const existing = await clientTypeRepository.findById(id);
  if (!existing) throw new ApiError(404, 'Tipo de cliente no encontrado');
  return clientTypeRepository.remove(id);
}
