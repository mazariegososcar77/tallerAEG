import * as clientRepository from '../repositories/clientRepository.js';
import { ApiError } from '../utils/ApiError.js';

function normalize(data) {
  // last_name NO se incluye: es obligatorio (NOT NULL); si va vacío se guarda como ''.
  const nullIfEmpty = ['nit', 'dpi', 'email', 'trade_name', 'contact_name', 'dependency'];
  const result = { ...data };
  for (const key of nullIfEmpty) {
    if (result[key] !== undefined && result[key] !== null && String(result[key]).trim() === '') {
      result[key] = null;
    }
  }
  return result;
}

export async function list() {
  return clientRepository.getAll();
}

export async function getById(id) {
  const c = await clientRepository.findById(id);
  if (!c) throw new ApiError(404, 'Cliente no encontrado');
  return c;
}

export async function create(data) {
  return clientRepository.create(normalize(data));
}

export async function update(id, patch) {
  const existing = await clientRepository.findById(id);
  if (!existing) throw new ApiError(404, 'Cliente no encontrado');
  return clientRepository.update(id, normalize(patch));
}

export async function remove(id) {
  const existing = await clientRepository.findById(id);
  if (!existing) throw new ApiError(404, 'Cliente no encontrado');
  return clientRepository.remove(id);
}
