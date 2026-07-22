-- =====================================================================
-- 019_invoices.sql  -  Modulo de Facturacion
-- Una factura por orden de trabajo, generada al finalizar su reporte.
-- Los campos fel_* quedan NULL hasta integrar un certificador FEL real
-- (ver backend/src/services/felCertifier.js) -- no se debe simular un
-- UUID/serie FEL falso mientras no exista esa integracion.
-- MySQL 8 / InnoDB / utf8mb4. Ejecutar despues de 018_work_reports.sql
-- =====================================================================

CREATE TABLE invoices (
  id                INT UNSIGNED NOT NULL AUTO_INCREMENT,
  number            VARCHAR(20)  NOT NULL,
  work_order_id     INT UNSIGNED NOT NULL,
  work_report_id    INT UNSIGNED NULL,
  quote_id          INT UNSIGNED NULL,
  client_id         INT UNSIGNED NOT NULL,
  date              DATE         NOT NULL,
  subtotal          DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  discount          DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  total             DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  status            ENUM('pendiente_certificacion','certificada','anulada') NOT NULL DEFAULT 'pendiente_certificacion',
  client_email      VARCHAR(150) NULL,
  email_sent_at     DATETIME     NULL,
  fel_certifier     VARCHAR(60)  NULL,
  fel_uuid          VARCHAR(64)  NULL,
  fel_series        VARCHAR(20)  NULL,
  fel_number        VARCHAR(20)  NULL,
  fel_certified_at  DATETIME     NULL,
  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_invoices_number (number),
  UNIQUE KEY uq_invoices_order (work_order_id),
  KEY idx_invoices_client (client_id),
  KEY idx_invoices_status (status),
  KEY idx_invoices_date (date),
  CONSTRAINT fk_invoices_order FOREIGN KEY (work_order_id) REFERENCES work_orders (id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_invoices_report FOREIGN KEY (work_report_id) REFERENCES work_reports (id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_invoices_quote FOREIGN KEY (quote_id) REFERENCES quotes (id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_invoices_client FOREIGN KEY (client_id) REFERENCES clients (id)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE invoice_items (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  invoice_id    INT UNSIGNED NOT NULL,
  description   VARCHAR(255) NOT NULL,
  quantity      DECIMAL(10,2) NOT NULL DEFAULT 1,
  unit_price    DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  subtotal      DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  PRIMARY KEY (id),
  KEY idx_ii_invoice (invoice_id),
  CONSTRAINT fk_invoice_items_invoice FOREIGN KEY (invoice_id) REFERENCES invoices (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
