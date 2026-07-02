-- =====================================================================
-- 014_clients_validation.sql  -  Validacion de clientes
-- Agrega el estado "validado" a los clientes y dos permisos nuevos:
--   * clients.quick-create : crear clientes "de ultima instancia" desde el
--     selector de Ordenes de trabajo / Cotizaciones. Estos entran SIN validar.
--   * clients.validate     : marcar un cliente como validado tras revisarlo.
-- Los clientes existentes y los creados desde el modulo Clientes quedan
-- validados (is_validated = 1 por defecto). Solo el alta rapida entra en 0.
-- Ejecutar despues de 013_clients_nullable_optional.sql
-- =====================================================================

ALTER TABLE clients
  ADD COLUMN is_validated TINYINT(1) NOT NULL DEFAULT 1 AFTER is_active;

-- Permisos nuevos (continuan la numeracion de 009_clients_seed.sql)
INSERT INTO permissions (id, code, description, module) VALUES
  (35, 'clients.quick-create', 'Crear clientes rapidos (desde ordenes/cotizaciones)', 'Clientes'),
  (36, 'clients.validate',     'Validar clientes',                                    'Clientes');

-- Mapeo rol -> permisos
-- Administrador (rol 1): ambos permisos nuevos
INSERT INTO role_permissions (role_id, permission_id) VALUES
  (1,35),(1,36);
-- Operador (rol 2): puede crear clientes rapidos (crea ordenes/cotizaciones),
-- pero NO validar (eso lo revisa un administrador).
INSERT INTO role_permissions (role_id, permission_id) VALUES
  (2,35);
