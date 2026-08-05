// Este archivo maneja las MAQUINAS: los equipos (motores electricos, etc.) que le
// pertenecen a cada cliente, sobre los que despues se programan mantenimientos.
import * as machineRepository from '../repositories/machineRepository.js';
import { ApiError } from '../utils/ApiError.js';

// Limpia los datos tecnicos de la maquina antes de guardarlos: si un campo opcional
// (kw, hp, rpm, voltaje, amperaje, marca, modelo, serie, ubicacion, notas) llega
// vacio, se guarda como "sin dato" en vez de texto vacio.
function normalize(data) {
  const nullIfEmpty = ['kw', 'hp', 'rpm', 'voltage', 'amperage', 'brand', 'model', 'serial', 'location', 'notes'];
  const result = { ...data };
  for (const key of nullIfEmpty) {
    if (result[key] !== undefined && String(result[key]).trim() === '') {
      result[key] = null;
    }
  }
  return result;
}

// Devuelve las maquinas; si se indica clientId, solo las de ese cliente.
export async function list(clientId) { return machineRepository.getAll(clientId); }
// Busca una maquina por id. Si no existe, avisa con un error.
export async function getById(id) {
  const m = await machineRepository.findById(id);
  if (!m) throw new ApiError(404, 'Maquina no encontrada');
  return m;
}
// Registra una maquina nueva para un cliente.
export async function create(data) { return machineRepository.create(normalize(data)); }
// Edita los datos de una maquina existente.
export async function update(id, patch) {
  if (!await machineRepository.findById(id)) throw new ApiError(404, 'Maquina no encontrada');
  return machineRepository.update(id, normalize(patch));
}
// Elimina una maquina.
export async function remove(id) {
  if (!await machineRepository.findById(id)) throw new ApiError(404, 'Maquina no encontrada');
  return machineRepository.remove(id);
}
