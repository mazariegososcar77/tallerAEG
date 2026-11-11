-- =====================================================================
-- 053_segundo_cojinete.sql  -  Numero del segundo cojinete, a la par de su
-- propia medida (antes "Cambio de cojinetes No." era un solo campo donde se
-- escribian los dos numeros juntos, ej. "6O6 y 6208", separados de las dos
-- casillas de medida que estaban en otro lugar del formulario).
-- Ejecutar despues de 052_tecnico_crear_ot_pre_aprobada.sql
-- =====================================================================

ALTER TABLE work_orders
  ADD COLUMN bearings_count_2 VARCHAR(30) NULL AFTER bearings_count;

ALTER TABLE service_orders
  ADD COLUMN bearings_count_2 VARCHAR(100) NULL AFTER bearings_count;
