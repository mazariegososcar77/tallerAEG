-- =====================================================================
-- 037_work_report_photo_categories.sql  -  Categorias de foto + video final
-- Reemplaza las 4 etapas fijas del reporte de trabajo (antes/desarmado/
-- piezas_nuevas/armado_final) por las 8 categorias reales del manual de
-- Abdias (con un MINIMO de fotos por categoria, sin tope maximo) + un video
-- final de prueba (maximo 30 segundos, comprimido al subirlo -- ver
-- workReportService.js).
--
-- Compatibilidad con reportes viejos: se AMPLIA el ENUM de `stage` en vez de
-- reemplazarlo -- los 4 valores viejos siguen siendo validos para siempre, asi
-- que las fotos ya subidas no se tocan ni se migran. `photo_schema_version`
-- es la bisagra: 1 = reporte con las 4 etapas de siempre (UI y validacion
-- intactas), 2 = reporte con las 8 categorias + video nuevas. Todo lo que ya
-- existe en este momento se marca 1 explicitamente; el DEFAULT 2 de la
-- columna cubre solo, de aqui en adelante, los reportes que se creen despues
-- de aplicar este script.
--
-- El video va como columnas en work_reports (una sola ranura por reporte,
-- mismo patron que tech_signature_url/client_signature_url) y no como tabla
-- aparte: a diferencia de las fotos, no es una lista sin tope, es un unico
-- archivo requerido.
-- MySQL 8 / InnoDB / utf8mb4. Ejecutar despues de 036_work_order_documents.sql
-- =====================================================================

ALTER TABLE work_report_photos
  MODIFY COLUMN stage ENUM(
    'antes','desarmado','piezas_nuevas','armado_final',
    'ingreso','placa_datos','mediciones_ingreso','desarme',
    'mantenimiento','repuestos','armado','mediciones_finales'
  ) NOT NULL;

ALTER TABLE work_reports
  ADD COLUMN photo_schema_version TINYINT UNSIGNED NOT NULL DEFAULT 2 AFTER stage_notes,
  ADD COLUMN final_video_url VARCHAR(500) NULL AFTER photo_schema_version,
  ADD COLUMN final_video_duration_seconds SMALLINT UNSIGNED NULL AFTER final_video_url,
  ADD COLUMN final_video_size_bytes INT UNSIGNED NULL AFTER final_video_duration_seconds;

UPDATE work_reports SET photo_schema_version = 1;
