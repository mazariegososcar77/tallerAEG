/** Logica de permisos (catalogo de solo lectura). */
import * as permissionRepository from '../repositories/permissionRepository.js';

/** Lista de permisos ordenada por modulo y luego por codigo. */
export function list() {
  return permissionRepository
    .getAll()
    .slice()
    .sort((a, b) => a.module.localeCompare(b.module) || a.code.localeCompare(b.code));
}
