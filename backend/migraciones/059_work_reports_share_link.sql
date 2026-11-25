-- =====================================================================
-- 059_work_reports_share_link.sql  -  Enlace publico de SOLO LECTURA
-- Token independiente del de firma remota (027_work_reports_signing_link.sql):
-- este se comparte con el cliente para que vea el reporte completo (fotos,
-- videos, notas y firmas) desde su propio telefono, sin sesion y SIN poder
-- modificar nada -- no existe ningun endpoint publico que acepte este token
-- para escribir. Quien tenga el token de firma puede firmar; quien tenga
-- este, solo puede ver.
-- Ejecutar despues de 058_work_report_category_videos.sql
-- =====================================================================

ALTER TABLE work_reports
  ADD COLUMN share_token VARCHAR(64) NULL AFTER client_signature_token,
  ADD UNIQUE KEY uq_wr_share_token (share_token);
