-- =====================================================================
-- 020_reports_billing_seed.sql  -  Permisos de Reportes de Trabajo y Facturacion
-- Continua la numeracion de 014_clients_validation.sql (ultimo id: 36).
-- Ejecutar despues de 019_invoices.sql
-- =====================================================================

INSERT INTO permissions (id, code, description, module) VALUES
  (37, 'work-reports.view',   'Ver reportes de trabajo',      'Reportes'),
  (38, 'work-reports.create', 'Crear reportes de trabajo',    'Reportes'),
  (39, 'work-reports.update', 'Editar reportes de trabajo',   'Reportes'),
  (40, 'work-reports.delete', 'Eliminar reportes de trabajo', 'Reportes'),
  (41, 'billing.view',        'Ver facturas',                 'Facturacion'),
  (42, 'billing.create',      'Generar facturas',             'Facturacion'),
  (43, 'billing.certify',     'Certificar facturas',          'Facturacion');

-- Administrador (rol 1): todos los permisos nuevos
INSERT INTO role_permissions (role_id, permission_id) VALUES
  (1,37),(1,38),(1,39),(1,40),(1,41),(1,42),(1,43);
-- Operador (rol 2): reportes sin borrar, facturacion sin certificar
-- (certificar es una accion fiscal sensible, reservada a Administrador).
INSERT INTO role_permissions (role_id, permission_id) VALUES
  (2,37),(2,38),(2,39),(2,41),(2,42);
-- Consulta (rol 3): solo ver
INSERT INTO role_permissions (role_id, permission_id) VALUES
  (3,37),(3,41);
