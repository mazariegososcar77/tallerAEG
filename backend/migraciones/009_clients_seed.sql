-- =====================================================================
-- 009_clients_seed.sql  -  Permisos y catalogos del modulo de Clientes
-- Ejecutar despues de 008_clients.sql
-- =====================================================================

-- Permisos nuevos (continuan la numeracion de 004_inventory_seed.sql)
INSERT INTO permissions (id, code, description, module) VALUES
  (23, 'clients.view',         'Ver clientes',                   'Clientes'),
  (24, 'clients.create',       'Crear clientes',                 'Clientes'),
  (25, 'clients.update',       'Editar clientes',                'Clientes'),
  (26, 'clients.delete',       'Eliminar clientes',              'Clientes'),
  (27, 'client-types.view',    'Ver tipos de cliente',           'Configuracion'),
  (28, 'client-types.create',  'Crear tipos de cliente',         'Configuracion'),
  (29, 'client-types.update',  'Editar tipos de cliente',        'Configuracion'),
  (30, 'client-types.delete',  'Eliminar tipos de cliente',      'Configuracion'),
  (31, 'loyalty.view',         'Ver niveles de fidelizacion',    'Configuracion'),
  (32, 'loyalty.create',       'Crear niveles de fidelizacion',  'Configuracion'),
  (33, 'loyalty.update',       'Editar niveles de fidelizacion', 'Configuracion'),
  (34, 'loyalty.delete',       'Eliminar niveles de fidelizacion','Configuracion');

-- Administrador (rol 1): todos los permisos nuevos
INSERT INTO role_permissions (role_id, permission_id) VALUES
  (1,23),(1,24),(1,25),(1,26),(1,27),(1,28),(1,29),(1,30),(1,31),(1,32),(1,33),(1,34);
-- Operador (rol 2): clientes (sin borrar) + ver catalogos
INSERT INTO role_permissions (role_id, permission_id) VALUES
  (2,23),(2,24),(2,25),(2,27),(2,31);
-- Consulta (rol 3): solo ver
INSERT INTO role_permissions (role_id, permission_id) VALUES
  (3,23),(3,27),(3,31);

-- Catalogos iniciales
INSERT INTO client_types (id, name, description) VALUES
  (1, 'Particular', 'Persona individual'),
  (2, 'Empresa',    'Empresa o negocio'),
  (3, 'Gobierno',   'Entidad gubernamental');

INSERT INTO loyalty_tiers (id, name, discount, benefits) VALUES
  (1, 'Bronce', 5.00,  'Descuento basico en servicios'),
  (2, 'Plata',  10.00, 'Descuento y atencion prioritaria'),
  (3, 'Oro',    15.00, 'Descuento maximo, atencion VIP y entregas express');
