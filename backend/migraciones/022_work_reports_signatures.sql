-- =====================================================================
-- 022_work_reports_signatures.sql  -  Firmas del reporte de trabajo
-- Dos firmas dibujadas en pantalla (canvas -> PNG subido como imagen,
-- mismo patron que las fotos de etapa): quien entrega el trabajo
-- (tecnico) y quien lo recibe (cliente/encargado). Se guardan como URL +
-- nombre impreso, igual que el resto de imagenes del sistema.
-- Ejecutar despues de 021_work_reports_force_edit.sql
-- =====================================================================

ALTER TABLE work_reports
  ADD COLUMN tech_signature_url    VARCHAR(500) NULL AFTER stage_notes,
  ADD COLUMN tech_signature_name   VARCHAR(150) NULL AFTER tech_signature_url,
  ADD COLUMN client_signature_url  VARCHAR(500) NULL AFTER tech_signature_name,
  ADD COLUMN client_signature_name VARCHAR(150) NULL AFTER client_signature_url;
