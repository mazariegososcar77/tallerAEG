import * as machineRepository from '../repositories/machineRepository.js';
import { ApiError } from '../utils/ApiError.js';

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

export async function list(clientId) { return machineRepository.getAll(clientId); }
export async function getById(id) {
  const m = await machineRepository.findById(id);
  if (!m) throw new ApiError(404, 'Maquina no encontrada');
  return m;
}
export async function create(data) { return machineRepository.create(normalize(data)); }
export async function update(id, patch) {
  if (!await machineRepository.findById(id)) throw new ApiError(404, 'Maquina no encontrada');
  return machineRepository.update(id, normalize(patch));
}
export async function remove(id) {
  if (!await machineRepository.findById(id)) throw new ApiError(404, 'Maquina no encontrada');
  return machineRepository.remove(id);
}
