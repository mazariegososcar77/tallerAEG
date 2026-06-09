/**
 * Backfill no destructivo del modulo de Clientes sobre datos JSON ya sembrados.
 * Agrega los permisos/roles nuevos (idempotente) y crea los catalogos de clientes
 * sin tocar usuarios, articulos ni el resto de los datos existentes.
 *
 * Uso: node scripts/backfill_clients.mjs
 * (Para una instalacion limpia usa el seed normal: npm run seed)
 */
import { readCollection, writeCollection, now } from '../src/lib/jsonStore.js';

const NEW_PERMISSIONS = [
  { id: 23, module: 'Clientes', code: 'clients.view', description: 'Ver clientes' },
  { id: 24, module: 'Clientes', code: 'clients.create', description: 'Crear clientes' },
  { id: 25, module: 'Clientes', code: 'clients.update', description: 'Editar clientes' },
  { id: 26, module: 'Clientes', code: 'clients.delete', description: 'Eliminar clientes' },
  { id: 27, module: 'Configuracion', code: 'client-types.view', description: 'Ver tipos de cliente' },
  { id: 28, module: 'Configuracion', code: 'client-types.create', description: 'Crear tipos de cliente' },
  { id: 29, module: 'Configuracion', code: 'client-types.update', description: 'Editar tipos de cliente' },
  { id: 30, module: 'Configuracion', code: 'client-types.delete', description: 'Eliminar tipos de cliente' },
  { id: 31, module: 'Configuracion', code: 'loyalty.view', description: 'Ver niveles de fidelizacion' },
  { id: 32, module: 'Configuracion', code: 'loyalty.create', description: 'Crear niveles de fidelizacion' },
  { id: 33, module: 'Configuracion', code: 'loyalty.update', description: 'Editar niveles de fidelizacion' },
  { id: 34, module: 'Configuracion', code: 'loyalty.delete', description: 'Eliminar niveles de fidelizacion' },
];

// role_id -> permission_ids que se le otorgan
const ROLE_GRANTS = {
  1: [23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34], // Administrador
  2: [23, 24, 25, 27, 31], // Operador
  3: [23, 27, 31], // Consulta
};

const CLIENT_TYPES = [
  { id: 1, name: 'Particular', description: 'Persona individual' },
  { id: 2, name: 'Empresa', description: 'Empresa o negocio' },
  { id: 3, name: 'Gobierno', description: 'Entidad gubernamental' },
];

const LOYALTY_TIERS = [
  { id: 1, name: 'Bronce', discount: 5, benefits: 'Descuento basico en servicios', color: '#CD7F32', icon: 'shield' },
  { id: 2, name: 'Plata', discount: 10, benefits: 'Descuento y atencion prioritaria', color: '#9CA3AF', icon: 'medal' },
  { id: 3, name: 'Oro', discount: 15, benefits: 'Descuento maximo, atencion VIP y entregas express', color: '#D4AF37', icon: 'crown' },
];

const timestamp = now();
const withMeta = (rows) => rows.map((r) => ({ ...r, is_active: true, created_at: timestamp, updated_at: timestamp }));

// 1) Permisos (por code, idempotente)
const permissions = readCollection('permissions');
const existingCodes = new Set(permissions.map((p) => p.code));
let addedPerms = 0;
for (const p of NEW_PERMISSIONS) {
  if (!existingCodes.has(p.code)) {
    permissions.push(p);
    addedPerms += 1;
  }
}
if (addedPerms) writeCollection('permissions', permissions);

// 2) role_permissions (por par role/permiso, idempotente)
const rolePerms = readCollection('role_permissions');
const seenPairs = new Set(rolePerms.map((rp) => `${rp.role_id}:${rp.permission_id}`));
let addedPairs = 0;
for (const [roleId, permIds] of Object.entries(ROLE_GRANTS)) {
  for (const permId of permIds) {
    const key = `${roleId}:${permId}`;
    if (!seenPairs.has(key)) {
      rolePerms.push({ role_id: Number(roleId), permission_id: permId });
      seenPairs.add(key);
      addedPairs += 1;
    }
  }
}
if (addedPairs) writeCollection('role_permissions', rolePerms);

// 3) Catalogos de clientes (solo si no existen)
let createdCollections = 0;
if (readCollection('client_types').length === 0) {
  writeCollection('client_types', withMeta(CLIENT_TYPES));
  createdCollections += 1;
}
if (readCollection('loyalty_tiers').length === 0) {
  writeCollection('loyalty_tiers', withMeta(LOYALTY_TIERS));
  createdCollections += 1;
}
// clients: crear archivo vacio si no existe (readCollection devuelve [] aunque falte)
writeCollection('clients', readCollection('clients'));

console.log('Backfill de clientes aplicado:');
console.log(`  +${addedPerms} permisos, +${addedPairs} asignaciones de rol.`);
console.log(`  ${createdCollections} catalogos creados (client_types/loyalty_tiers).`);
console.log('  NOTA: vuelve a iniciar sesion para que el admin obtenga los permisos nuevos en su token.');
