/**
 * Inicializa los archivos JSON con datos por defecto: catalogo de permisos,
 * roles base, su mapeo de permisos y un usuario administrador.
 *
 * Uso:
 *   npm run seed            -> inicializa solo si no hay datos previos
 *   FORCE=1 npm run seed     -> reinicia los datos (sobrescribe lo existente)
 *
 * Equivale, en el mundo JSON, a aplicar migraciones/001_init.sql + 002_seed.sql.
 */
import { writeCollection, readCollection, now } from './lib/jsonStore.js';
import { hashPassword } from './utils/password.js';

// Catalogo de permisos (ids deterministas = indice + 1 para que sean estables).
const PERMISSION_CATALOG = [
  { module: 'Panel', code: 'dashboard.view', description: 'Ver el panel principal' },
  { module: 'Usuarios', code: 'users.view', description: 'Ver usuarios' },
  { module: 'Usuarios', code: 'users.create', description: 'Crear usuarios' },
  { module: 'Usuarios', code: 'users.update', description: 'Editar usuarios' },
  { module: 'Usuarios', code: 'users.delete', description: 'Eliminar usuarios' },
  { module: 'Roles', code: 'roles.view', description: 'Ver roles' },
  { module: 'Roles', code: 'roles.create', description: 'Crear roles' },
  { module: 'Roles', code: 'roles.update', description: 'Editar roles y sus permisos' },
  { module: 'Roles', code: 'roles.delete', description: 'Eliminar roles' },
  { module: 'Permisos', code: 'permissions.view', description: 'Ver permisos' },
  { module: 'Inventario', code: 'articles.view', description: 'Ver articulos' },
  { module: 'Inventario', code: 'articles.create', description: 'Crear articulos' },
  { module: 'Inventario', code: 'articles.update', description: 'Editar articulos' },
  { module: 'Inventario', code: 'articles.delete', description: 'Eliminar articulos' },
  { module: 'Configuracion', code: 'article-types.view', description: 'Ver tipos de articulo' },
  { module: 'Configuracion', code: 'article-types.create', description: 'Crear tipos de articulo' },
  { module: 'Configuracion', code: 'article-types.update', description: 'Editar tipos de articulo' },
  { module: 'Configuracion', code: 'article-types.delete', description: 'Eliminar tipos de articulo' },
  { module: 'Configuracion', code: 'warehouses.view', description: 'Ver bodegas' },
  { module: 'Configuracion', code: 'warehouses.create', description: 'Crear bodegas' },
  { module: 'Configuracion', code: 'warehouses.update', description: 'Editar bodegas' },
  { module: 'Configuracion', code: 'warehouses.delete', description: 'Eliminar bodegas' },
];

const PERMISSIONS = PERMISSION_CATALOG.map((p, i) => ({ id: i + 1, ...p }));
const permissionId = (code) => PERMISSIONS.find((p) => p.code === code).id;
const allCodes = PERMISSIONS.map((p) => p.code);

// Roles base y los permisos (por code) que tiene cada uno.
const ROLE_DEFS = [
  {
    id: 1,
    name: 'Administrador',
    description: 'Acceso total al sistema',
    permissions: allCodes,
  },
  {
    id: 2,
    name: 'Operador',
    description: 'Gestiona usuarios e inventario; consulta catalogos',
    permissions: [
      'dashboard.view',
      'users.view',
      'users.create',
      'users.update',
      'roles.view',
      'permissions.view',
      'articles.view',
      'articles.create',
      'articles.update',
      'article-types.view',
      'warehouses.view',
    ],
  },
  {
    id: 3,
    name: 'Consulta',
    description: 'Solo lectura',
    permissions: [
      'dashboard.view',
      'users.view',
      'roles.view',
      'permissions.view',
      'articles.view',
      'article-types.view',
      'warehouses.view',
    ],
  },
];

// Catalogos iniciales del inventario.
const ARTICLE_TYPES = [
  { id: 1, name: 'Maquina', description: 'Maquinas y equipos' },
  { id: 2, name: 'Repuesto', description: 'Repuestos y partes' },
  { id: 3, name: 'Articulo electronico', description: 'Componentes y articulos electronicos' },
];

const WAREHOUSES = [
  { id: 1, name: 'Bodega Central', description: 'Bodega principal', color: '#16285C' },
  { id: 2, name: 'Bodega de Repuestos', description: 'Almacen de repuestos', color: '#E8551C' },
];

async function seed() {
  const force = process.env.FORCE === '1' || process.argv.includes('--force');
  const hasData = readCollection('users').length > 0;

  if (hasData && !force) {
    console.log('Ya existen datos. Usa "FORCE=1 npm run seed" para reinicializar.');
    return;
  }

  // permissions
  writeCollection('permissions', PERMISSIONS);

  // roles (sin el campo auxiliar "permissions")
  const timestamp = now();
  const roles = ROLE_DEFS.map(({ permissions, ...role }) => ({
    ...role,
    is_active: true,
    created_at: timestamp,
    updated_at: timestamp,
  }));
  writeCollection('roles', roles);

  // role_permissions (relacion N:M)
  const rolePermissions = ROLE_DEFS.flatMap((role) =>
    role.permissions.map((code) => ({
      role_id: role.id,
      permission_id: permissionId(code),
    })),
  );
  writeCollection('role_permissions', rolePermissions);

  // usuario administrador
  const adminPassword = 'Admin123!';
  const users = [
    {
      id: 1,
      name: 'Administrador',
      email: 'admin@talleraeg.com',
      password_hash: await hashPassword(adminPassword),
      role_id: 1,
      is_active: true,
      created_at: timestamp,
      updated_at: timestamp,
    },
  ];
  writeCollection('users', users);

  // catalogos de inventario
  const catalog = (rows) =>
    rows.map((r) => ({ ...r, is_active: true, created_at: timestamp, updated_at: timestamp }));
  writeCollection('article_types', catalog(ARTICLE_TYPES));
  writeCollection('warehouses', catalog(WAREHOUSES));
  writeCollection('articles', []);

  console.log('Datos inicializados:');
  console.log(`  ${PERMISSIONS.length} permisos, ${roles.length} roles, 1 usuario.`);
  console.log(`  ${ARTICLE_TYPES.length} tipos de articulo, ${WAREHOUSES.length} bodegas, 0 articulos.`);
  console.log('  Admin -> admin@talleraeg.com / Admin123!');
}

seed().catch((err) => {
  console.error('Error en el seed:', err);
  process.exit(1);
});
