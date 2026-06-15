import * as permissionRepository from '../repositories/permissionRepository.js';

export async function list() {
  const perms = await permissionRepository.getAll();
  return perms.slice().sort((a, b) => a.module.localeCompare(b.module) || a.code.localeCompare(b.code));
}
