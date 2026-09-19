// Este archivo maneja los TIPOS DE EQUIPO: el catálogo configurable (con categoría) de las
// casillas "Tipo de equipo" de las Órdenes de Trabajo y de Servicio. Cada tipo tiene un
// `code` estable que es lo que se guarda dentro de las órdenes.
import * as equipmentTypeRepository from '../repositories/equipmentTypeRepository.js';
import { ApiError } from '../utils/ApiError.js';

// Arma el código a partir del nombre: minúsculas, sin acentos, con guiones bajos.
function slugify(name) {
  const slug = name
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
    .slice(0, 90);
  return slug || 'tipo';
}

// Devuelve el catálogo completo.
export async function list() {
  return equipmentTypeRepository.getAll();
}
// Mapa código -> nombre, para que los PDF muestren el nombre de los tipos creados desde Configuración.
export async function labelMap() {
  const rows = await equipmentTypeRepository.getAll();
  return Object.fromEntries(rows.map((r) => [r.code, r.name]));
}
// Crea un tipo nuevo con un código único derivado del nombre.
export async function create({ name, category, is_active }) {
  const base = slugify(name);
  let code = base;
  for (let n = 2; await equipmentTypeRepository.codeExists(code); n++) code = `${base}_${n}`;
  return equipmentTypeRepository.create({ code, name: name.trim(), category: (category || 'Otros').trim(), is_active });
}
// Edita un tipo existente (el código no cambia).
export async function update(id, patch) {
  const existing = await equipmentTypeRepository.findById(id);
  if (!existing) throw new ApiError(404, 'Tipo de equipo no encontrado');
  const data = { ...patch };
  if (data.name) data.name = data.name.trim();
  if (data.category) data.category = data.category.trim();
  if ('is_active' in data) data.is_active = data.is_active ? 1 : 0;
  return equipmentTypeRepository.update(id, data);
}
// Elimina un tipo. Las órdenes que lo usaban conservan el código.
export async function remove(id) {
  const existing = await equipmentTypeRepository.findById(id);
  if (!existing) throw new ApiError(404, 'Tipo de equipo no encontrado');
  return equipmentTypeRepository.remove(id);
}
