-- =====================================================================
-- 028_service_order_field_report.sql  -  Orden de Servicio = visita tecnica de campo
-- Redefine por completo el modulo "Orden de Servicio": deja de ser trabajo
-- mandado a subcontratistas externos y pasa a ser el formato real que usa
-- el taller para visitas tecnicas de campo (servicio de bombas/pozos en el
-- sitio del cliente): datos del cliente, fuente de energia, mediciones
-- electricas, condiciones del equipo, componentes instalados,
-- especificaciones adicionales, reporte tecnico y firmas (tecnico + cliente,
-- reusando el mismo mecanismo de dibujo a mano + enlace publico de firma
-- remota que ya existe para Reportes de Trabajo, ver
-- 027_work_reports_signing_link.sql).
-- Ejecutar despues de 027_work_reports_signing_link.sql
-- =====================================================================

ALTER TABLE service_orders
  DROP FOREIGN KEY fk_so_subcontractor,
  DROP COLUMN subcontractor_id,
  DROP COLUMN agreed_cost,
  DROP COLUMN actual_cost,
  DROP COLUMN description,
  DROP COLUMN sent_at,
  DROP COLUMN expected_return_at,
  DROP COLUMN received_at,
  MODIFY COLUMN status ENUM('programada','en_proceso','completada','cancelada') NOT NULL DEFAULT 'programada',

  -- Datos del cliente (captura libre al llamar/visitar; client_id sigue opcional para enlazar al catalogo)
  ADD COLUMN caller_name VARCHAR(150) NULL AFTER client_id,
  ADD COLUMN client_address VARCHAR(255) NULL AFTER caller_name,
  ADD COLUMN client_nit VARCHAR(30) NULL AFTER client_address,
  ADD COLUMN client_phone VARCHAR(30) NULL AFTER client_nit,
  ADD COLUMN visit_date DATE NOT NULL AFTER client_phone,
  ADD COLUMN visit_time TIME NULL AFTER visit_date,
  ADD COLUMN reported_problem TEXT NULL AFTER visit_time,

  -- Fuente de energia
  ADD COLUMN transformer_bank VARCHAR(100) NULL,
  ADD COLUMN generator VARCHAR(100) NULL,
  ADD COLUMN voltage_source VARCHAR(60) NULL,

  -- Mediciones electricas y componentes instalados: filas fijas del papel, guardadas como
  -- JSON (mismo patron ya usado en quotes.equipment_data / work_reports.stage_notes) en vez
  -- de decenas de columnas rigidas -- las columnas de las mediciones cambian de sentido
  -- segun la fila (L1-L2/L2-L3/... en unas, T1-T2/T2-T3/... en otras).
  ADD COLUMN electrical_measurements JSON NULL,
  ADD COLUMN installed_components JSON NULL,

  -- Condiciones de trabajo del equipo (pozo/bomba)
  ADD COLUMN pump_from VARCHAR(60) NULL,
  ADD COLUMN pump_to VARCHAR(60) NULL,
  ADD COLUMN well_type ENUM('sumergible','centrifuga') NULL,
  ADD COLUMN diameter VARCHAR(60) NULL,
  ADD COLUMN total_depth VARCHAR(60) NULL,
  ADD COLUMN static_level VARCHAR(60) NULL,
  ADD COLUMN dynamic_level VARCHAR(60) NULL,
  ADD COLUMN gpm VARCHAR(60) NULL,
  ADD COLUMN pipe_count VARCHAR(60) NULL,
  ADD COLUMN air_line VARCHAR(60) NULL,
  ADD COLUMN cable_gauge VARCHAR(60) NULL,
  ADD COLUMN sleeve VARCHAR(60) NULL,
  ADD COLUMN pool_dimensions VARCHAR(150) NULL,

  -- Especificaciones adicionales (~19 campos del papel: HP motor/bomba, voltaje, etapas,
  -- precarga, filtro, PSI, etc.) -- mismo criterio JSON de arriba, claves fijas conocidas.
  ADD COLUMN additional_specs JSON NULL,

  -- Reporte tecnico (narrativa libre, la caja grande de renglones del papel)
  ADD COLUMN technical_report TEXT NULL,

  -- Horas de la visita
  ADD COLUMN arrival_time TIME NULL,
  ADD COLUMN departure_time TIME NULL,

  -- Firmas: mismo mecanismo que ya existe en work_reports.
  ADD COLUMN tech_signature_url VARCHAR(500) NULL,
  ADD COLUMN tech_signature_name VARCHAR(150) NULL,
  ADD COLUMN client_signature_url VARCHAR(500) NULL,
  ADD COLUMN client_signature_name VARCHAR(150) NULL,
  ADD COLUMN client_signature_token VARCHAR(64) NULL,
  ADD UNIQUE KEY uq_so_signature_token (client_signature_token);

-- El catalogo de subcontratistas queda huerfano (nadie lo referencia ya) -- se elimina.
DROP TABLE subcontractors;

-- Los 4 permisos subcontractors.* (ids 53-56, ver 026_service_orders.sql) tambien se eliminan
-- (y sus filas en role_permissions via ON DELETE CASCADE de esa tabla).
DELETE FROM permissions WHERE code IN ('subcontractors.view','subcontractors.create','subcontractors.update','subcontractors.delete');
