-- =====================================================================
-- 018_work_reports.sql  -  Modulo de Reportes de Trabajo
-- Documenta fotograficamente el proceso de reparacion en 4 etapas fijas:
-- antes de desarmar, desarmado + piezas nuevas, piezas instaladas + usadas,
-- armado final. Un reporte por orden de trabajo.
-- MySQL 8 / InnoDB / utf8mb4. Ejecutar despues de 017_work_orders_quote_link.sql
-- =====================================================================

CREATE TABLE work_reports (
  id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  work_order_id   INT UNSIGNED NOT NULL,
  number          VARCHAR(20)  NOT NULL,
  status          ENUM('en_progreso','finalizado') NOT NULL DEFAULT 'en_progreso',
  general_notes   TEXT         NULL,
  stage_notes     JSON         NULL,     -- {antes,desarmado,piezas_nuevas,armado_final: string}
  finalized_at    DATETIME     NULL,
  created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_work_reports_number (number),
  UNIQUE KEY uq_work_reports_order (work_order_id),
  CONSTRAINT fk_wr_order FOREIGN KEY (work_order_id) REFERENCES work_orders (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE work_report_photos (
  id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  work_report_id  INT UNSIGNED NOT NULL,
  stage           ENUM('antes','desarmado','piezas_nuevas','armado_final') NOT NULL,
  photo_url       VARCHAR(500) NOT NULL,
  caption         VARCHAR(255) NULL,
  sort_order      INT UNSIGNED NOT NULL DEFAULT 0,
  created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_wrp_report_stage (work_report_id, stage),
  CONSTRAINT fk_wrp_report FOREIGN KEY (work_report_id) REFERENCES work_reports (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
