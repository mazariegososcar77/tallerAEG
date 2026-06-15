-- =====================================================================
-- 004_inventory_seed.sql  -  Permisos y catalogos del modulo de Inventario
-- Ejecutar despues de 003_inventory.sql
-- =====================================================================

-- Permisos nuevos (continuan la numeracion de 002_seed.sql)
INSERT INTO permissions (id, code, description, module) VALUES
  (11, 'articles.view',          'Ver articulos',              'Inventario'),
  (12, 'articles.create',        'Crear articulos',            'Inventario'),
  (13, 'articles.update',        'Editar articulos',           'Inventario'),
  (14, 'articles.delete',        'Eliminar articulos',         'Inventario'),
  (15, 'article-types.view',     'Ver tipos de articulo',      'Configuracion'),
  (16, 'article-types.create',   'Crear tipos de articulo',    'Configuracion'),
  (17, 'article-types.update',   'Editar tipos de articulo',   'Configuracion'),
  (18, 'article-types.delete',   'Eliminar tipos de articulo', 'Configuracion'),
  (19, 'warehouses.view',        'Ver bodegas',                'Configuracion'),
  (20, 'warehouses.create',      'Crear bodegas',              'Configuracion'),
  (21, 'warehouses.update',      'Editar bodegas',             'Configuracion'),
  (22, 'warehouses.delete',      'Eliminar bodegas',           'Configuracion');

-- Administrador (rol 1): todos los permisos nuevos
INSERT INTO role_permissions (role_id, permission_id) VALUES
  (1,11),(1,12),(1,13),(1,14),(1,15),(1,16),(1,17),(1,18),(1,19),(1,20),(1,21),(1,22);
-- Operador (rol 2): inventario (sin borrar) + ver catalogos
INSERT INTO role_permissions (role_id, permission_id) VALUES
  (2,11),(2,12),(2,13),(2,15),(2,19);
-- Consulta (rol 3): solo ver
INSERT INTO role_permissions (role_id, permission_id) VALUES
  (3,11),(3,15),(3,19);

-- Catalogos iniciales
INSERT INTO article_types (id, name, description) VALUES
  (1, 'Maquina',              'Maquinas y equipos'),
  (2, 'Repuesto',             'Repuestos y partes'),
  (3, 'Articulo electronico', 'Componentes y articulos electronicos');

INSERT INTO warehouses (id, name, description) VALUES
  (1, 'Bodega Central',      'Bodega principal'),
  (2, 'Bodega de Repuestos', 'Almacen de repuestos');
