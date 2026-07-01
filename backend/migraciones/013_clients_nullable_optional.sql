-- =====================================================================
-- 013_clients_nullable_optional.sql  -  Campo opcional de clientes
-- El servicio (clientService.normalize) guarda como NULL el email cuando va
-- vacío: es opcional para empresas/entidades de gobierno. Sin embargo la tabla
-- lo definía NOT NULL, provocando el error "Column 'email' cannot be null" al
-- crear ese tipo de clientes. Esta migración vuelve NULL solo el email.
-- (last_name sigue siendo obligatorio / NOT NULL.)
-- Ejecutar después de 012_machines_maintenance.sql
-- =====================================================================

ALTER TABLE clients
  MODIFY COLUMN email VARCHAR(190) NULL;

-- Normaliza los emails vacíos existentes a NULL (coherente con la app).
UPDATE clients SET email = NULL WHERE email = '';
