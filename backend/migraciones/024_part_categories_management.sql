-- =====================================================================
-- 024_part_categories_management.sql  -  Gestion de categorias de pieza
-- La tabla part_categories (016_part_categories.sql) quedo vacia y sin
-- ninguna pantalla para administrarla -- el alta rapida de "Repuesto"
-- desde una cotizacion exige elegir una categoria, y no habia ninguna
-- que elegir. Este script:
--   1) siembra categorias iniciales razonables para un taller de motores
--      electricos (se pueden editar/agregar mas desde Configuracion).
--   2) agrega permisos granulares part-categories.* (antes colgaba de
--      dashboard.view) para la nueva pantalla de gestion.
-- Continua la numeracion de 021_work_reports_force_edit.sql (ultimo id: 44).
-- Ejecutar despues de 023_labor_catalog_seed.sql
-- =====================================================================

INSERT INTO part_categories (name, prefix) VALUES
  ('Rodamientos', 'ROD'),
  ('Electrico',   'ELE'),
  ('Mecanico',    'MEC'),
  ('Consumibles', 'CON'),
  ('Otros',       'OTR');

INSERT INTO permissions (id, code, description, module) VALUES
  (45, 'part-categories.view',   'Ver categorias de pieza',      'Configuracion'),
  (46, 'part-categories.create', 'Crear categorias de pieza',    'Configuracion'),
  (47, 'part-categories.update', 'Editar categorias de pieza',   'Configuracion'),
  (48, 'part-categories.delete', 'Eliminar categorias de pieza', 'Configuracion');

-- Administrador (rol 1): todos los permisos nuevos
INSERT INTO role_permissions (role_id, permission_id) VALUES
  (1,45),(1,46),(1,47),(1,48);
-- Operador (rol 2) y Consulta (rol 3): solo ver, igual que el resto de
-- catalogos de Configuracion (article-types, warehouses).
INSERT INTO role_permissions (role_id, permission_id) VALUES
  (2,45),
  (3,45);
