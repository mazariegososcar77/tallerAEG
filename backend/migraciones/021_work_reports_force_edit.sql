-- =====================================================================
-- 021_work_reports_force_edit.sql  -  Editar reportes ya finalizados
-- Permite a un rol de confianza (por defecto solo Administrador) modificar
-- fotos y notas de un reporte de trabajo aunque ya este en estado
-- 'finalizado' (por defecto, una vez finalizado queda de solo lectura para
-- todos). Continua la numeracion de 020_reports_billing_seed.sql (ultimo
-- id: 43). Ejecutar despues de 020_reports_billing_seed.sql
-- =====================================================================

INSERT INTO permissions (id, code, description, module) VALUES
  (44, 'work-reports.force-edit', 'Editar fotos y notas de un reporte ya finalizado', 'Reportes');

-- Solo Administrador (rol 1) puede editar reportes finalizados.
INSERT INTO role_permissions (role_id, permission_id) VALUES
  (1,44);
