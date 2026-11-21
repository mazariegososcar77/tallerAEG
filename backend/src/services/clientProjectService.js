// Este archivo maneja los SUB-PROYECTOS de un cliente: un mismo cliente (un NIT, ej. una
// cadena de restaurantes) puede tener varios proyectos/sucursales (ej. "Burger King
// Amatitlan"). No se puede crear un cliente nuevo por cada uno (el NIT es unico), asi que
// el proyecto es solo una etiqueta de nombre + ubicacion dentro del mismo cliente, que
// despues se puede elegir al registrar una maquina, una orden de trabajo o una cotizacion.
import * as clientProjectRepository from '../repositories/clientProjectRepository.js';
import { ApiError } from '../utils/ApiError.js';

// Aviso claro cuando el nombre ya lo usa otro sub-proyecto del mismo cliente.
async function assertNombreLibre(clientId, name, excludeId = null) {
  const otro = await clientProjectRepository.findByName(clientId, name, excludeId);
  if (otro) throw new ApiError(409, `Este cliente ya tiene un proyecto llamado "${otro.name}".`);
}

// Sub-proyectos activos de un cliente, para el selector.
export async function list(clientId) {
  return clientProjectRepository.getActiveByClient(clientId);
}

// Crea un sub-proyecto nuevo para un cliente (alta rapida desde el selector, sin salir
// del formulario de Maquinas/Ordenes de Trabajo/Cotizaciones).
export async function create(clientId, { name, location }) {
  const trimmed = (name || '').trim();
  if (!trimmed) throw new ApiError(400, 'El nombre del proyecto es obligatorio.');
  await assertNombreLibre(clientId, trimmed);
  return clientProjectRepository.create({
    client_id: clientId,
    name: trimmed,
    location: (location || '').trim() || null,
  });
}

// Edita un sub-proyecto existente (corregir el nombre, la ubicacion, o desactivarlo).
export async function update(id, patch) {
  const project = await clientProjectRepository.findById(id);
  if (!project) throw new ApiError(404, 'Proyecto no encontrado');
  if (patch.name !== undefined) {
    const trimmed = (patch.name || '').trim();
    if (!trimmed) throw new ApiError(400, 'El nombre del proyecto es obligatorio.');
    await assertNombreLibre(project.client_id, trimmed, id);
    patch.name = trimmed;
  }
  if (patch.location !== undefined) patch.location = (patch.location || '').trim() || null;
  return clientProjectRepository.update(id, patch);
}
