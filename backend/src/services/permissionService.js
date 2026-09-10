// Este archivo maneja los PERMISOS del sistema: la lista de "cosas que se pueden
// hacer" (ej. "crear clientes", "certificar facturas") que luego se le asignan a
// cada rol de usuario. Aqui no se crean ni se borran permisos (eso viene fijo del
// sistema), solo se consulta la lista ya ordenada para mostrarla en pantalla.
import * as permissionRepository from '../repositories/permissionRepository.js';

// Devuelve todos los permisos disponibles, ordenados por modulo y luego por
// codigo, para que se vean agrupados y ordenados en la pantalla de Roles.
export async function list() {
  const perms = await permissionRepository.getAll();
  return perms.slice().sort((a, b) => a.module.localeCompare(b.module) || a.code.localeCompare(b.code));
}
