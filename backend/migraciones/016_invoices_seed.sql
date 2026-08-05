-- =====================================================================
-- 016_invoices_seed.sql  -  Permisos del modulo de Facturacion
-- Ejecutar despues de 015_invoices.sql
-- =====================================================================

-- Permisos nuevos (continuan la numeracion de 014_clients_validation.sql)
INSERT INTO permissions (id, code, description, module) VALUES
  (37, 'invoices.view',    'Ver facturas',                          'Facturacion'),
  (38, 'invoices.create',  'Crear facturas (borrador)',              'Facturacion'),
  (39, 'invoices.certify', 'Certificar facturas ante el certificador FEL (Digifact)', 'Facturacion'),
  (40, 'invoices.void',    'Anular facturas certificadas',           'Facturacion'),
  (41, 'invoices.delete',  'Eliminar borradores de factura',         'Facturacion');

-- Administrador (rol 1): todos los permisos nuevos
INSERT INTO role_permissions (role_id, permission_id) VALUES
  (1,37),(1,38),(1,39),(1,40),(1,41);
-- Operador (rol 2): puede crear y certificar, pero no anular ni borrar
INSERT INTO role_permissions (role_id, permission_id) VALUES
  (2,37),(2,38),(2,39);
-- Consulta (rol 3): solo ver
INSERT INTO role_permissions (role_id, permission_id) VALUES
  (3,37);
