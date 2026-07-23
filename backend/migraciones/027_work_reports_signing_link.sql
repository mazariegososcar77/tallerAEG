-- =====================================================================
-- 027_work_reports_signing_link.sql  -  Enlace publico de firma remota
-- Permite generar un link (con un token largo y aleatorio) que un mensajero
-- puede abrir SIN iniciar sesion para que el cliente firme "Recibido" en su
-- propio telefono al momento de la entrega (motor terminado en el Centro de
-- Servicios AEG y enviado con mensajero, sin que el cliente este presente
-- en el taller). El token hace de "contraseña de un solo uso": quien lo
-- tenga puede firmar ESE reporte, nada mas.
-- Ejecutar despues de 026_service_orders.sql
-- =====================================================================

ALTER TABLE work_reports
  ADD COLUMN client_signature_token VARCHAR(64) NULL AFTER client_signature_name,
  ADD UNIQUE KEY uq_wr_signature_token (client_signature_token);
