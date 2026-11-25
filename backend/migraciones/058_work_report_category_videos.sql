-- =====================================================================
-- 058_work_report_category_videos.sql  -  Video opcional por categoria
-- Ademas del video final de prueba (una sola ranura por reporte, ver
-- 037_work_report_photo_categories.sql), ahora cualquier categoria de foto
-- puede llevar TAMBIEN un video corto propio -- por ejemplo, grabar la
-- pantalla del multimetro en "Mediciones Electricas de Ingreso" cuando el
-- valor se mueve y una foto sola no lo deja claro. Es opcional: no se exige
-- para finalizar el reporte (getMissingRequirements no lo pide).
--
-- Una fila por (reporte, categoria) -- una sola ranura por categoria, mismo
-- criterio que final_video_url, pero en tabla aparte (y no como columnas en
-- work_reports) porque aqui SI hay varias categorias posibles, no una sola.
-- Mismo ENUM de "stage" que work_report_photos, por la misma razon: un
-- reporte version 1 (4 etapas viejas) tecnicamente podria tener una fila
-- aqui, pero el servicio lo rechaza antes (solo aplica a version 2).
-- MySQL 8 / InnoDB / utf8mb4. Ejecutar despues de 057_clients_office_phone.sql
-- =====================================================================

CREATE TABLE work_report_category_videos (
  id                INT UNSIGNED NOT NULL AUTO_INCREMENT,
  work_report_id    INT UNSIGNED NOT NULL,
  stage             ENUM(
                      'antes','desarmado','piezas_nuevas','armado_final',
                      'ingreso','placa_datos','mediciones_ingreso','desarme',
                      'mantenimiento','repuestos','armado','mediciones_finales'
                    ) NOT NULL,
  video_url         VARCHAR(500) NOT NULL,
  duration_seconds  SMALLINT UNSIGNED NULL,
  size_bytes        INT UNSIGNED NULL,
  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_wrcv_report_stage (work_report_id, stage),
  CONSTRAINT fk_wrcv_report FOREIGN KEY (work_report_id) REFERENCES work_reports (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
