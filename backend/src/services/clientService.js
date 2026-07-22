// Este archivo maneja los CLIENTES del taller: verlos, crearlos, editarlos,
// eliminarlos, y la regla de "cliente validado" (que un administrador confirmo que
// sus datos son correctos, sobre todo cuando se dio de alta rapido desde una orden
// o cotizacion).
import * as clientRepository from '../repositories/clientRepository.js';
import { ApiError } from '../utils/ApiError.js';

// Limpia los datos del cliente antes de guardarlos: si un campo opcional (NIT, DPI,
// correo, nombre comercial, etc.) llega vacio, se guarda como "sin dato" en vez de
// como texto vacio, para no confundir "no tiene" con "escribieron nada".
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

// Devuelve la lista completa de clientes.
export async function list() {
  return clientRepository.getAll();
}

// Busca un cliente por id. Si no existe, avisa con un error.
export async function getById(id) {
  const c = await clientRepository.findById(id);
  if (!c) throw new ApiError(404, 'Cliente no encontrado');
  return c;
}

// Da de alta un cliente nuevo desde la pantalla de Clientes.
export async function create(data) {
  // is_validated no viaja en el payload (el schema zod lo descarta); la columna
  // usa su DEFAULT (1), asi que las altas del modulo Clientes entran validadas.
  return clientRepository.create(normalize(data));
}

// Alta "de ultima instancia" desde el selector de Ordenes/Cotizaciones: el
// cliente puede usarse de inmediato pero entra SIN validar para que un
// administrador revise sus datos despues.
export async function quickCreate(data) {
  return clientRepository.create({ ...normalize(data), is_validated: 0 });
}

// Marca un cliente como validado tras la revision del administrador.
export async function validate(id) {
  const existing = await clientRepository.findById(id);
  if (!existing) throw new ApiError(404, 'Cliente no encontrado');
  return clientRepository.update(id, { is_validated: 1 });
}

// Edita los datos de un cliente existente.
export async function update(id, patch) {
  const existing = await clientRepository.findById(id);
  if (!existing) throw new ApiError(404, 'Cliente no encontrado');
  return clientRepository.update(id, normalize(patch));
}

// Elimina un cliente.
export async function remove(id) {
  const existing = await clientRepository.findById(id);
  if (!existing) throw new ApiError(404, 'Cliente no encontrado');
  return clientRepository.remove(id);
}
