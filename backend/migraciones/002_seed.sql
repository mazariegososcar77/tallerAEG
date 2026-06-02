-- =====================================================================
-- 002_seed.sql  -  Datos iniciales del Sistema Taller AEG
-- Debe ejecutarse despues de 001_init.sql
-- =====================================================================

-- Roles base
INSERT INTO roles (id, name, description) VALUES
  (1, 'Administrador', 'Acceso total al sistema'),
  (2, 'Operador',      'Gestiona usuarios; consulta roles y permisos'),
  (3, 'Consulta',      'Solo lectura');

-- Catalogo de permisos
INSERT INTO permissions (id, code, description, module) VALUES
  (1,  'dashboard.view',   'Ver el panel principal',        'Panel'),
  (2,  'users.view',       'Ver usuarios',                  'Usuarios'),
  (3,  'users.create',     'Crear usuarios',                'Usuarios'),
  (4,  'users.update',     'Editar usuarios',               'Usuarios'),
  (5,  'users.delete',     'Eliminar usuarios',             'Usuarios'),
  (6,  'roles.view',       'Ver roles',                     'Roles'),
  (7,  'roles.create',     'Crear roles',                   'Roles'),
  (8,  'roles.update',     'Editar roles y sus permisos',   'Roles'),
  (9,  'roles.delete',     'Eliminar roles',                'Roles'),
  (10, 'permissions.view', 'Ver permisos',                  'Permisos');

-- Mapeo rol -> permisos
-- Administrador: todos los permisos
INSERT INTO role_permissions (role_id, permission_id) VALUES
  (1,1),(1,2),(1,3),(1,4),(1,5),(1,6),(1,7),(1,8),(1,9),(1,10);
-- Operador
INSERT INTO role_permissions (role_id, permission_id) VALUES
  (2,1),(2,2),(2,3),(2,4),(2,6),(2,10);
-- Consulta
INSERT INTO role_permissions (role_id, permission_id) VALUES
  (3,1),(3,2),(3,6),(3,10);

-- Usuario administrador.
-- password_hash corresponde a 'Admin123!' (bcrypt). Regenerar con:
--   node -e "console.log(require('bcryptjs').hashSync('Admin123!',10))"
INSERT INTO users (id, name, email, password_hash, role_id) VALUES
  (1, 'Administrador', 'admin@talleraeg.com', '$2a$10$GvJlfGAymdwih9kj4EMaY.EWgZysH4YAkbSfgI8QOa0z8cOa2eBAy', 1);
