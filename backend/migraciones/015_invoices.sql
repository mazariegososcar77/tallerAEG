-- =====================================================================
-- 015_invoices.sql  -  Modulo de Facturacion (integracion Digifact / FEL)
-- Tablas: invoices, invoice_items
-- MySQL 8 / InnoDB / utf8mb4. Ejecutar despues de 014_clients_validation.sql
--
-- Notas de diseno:
--  - work_order_id tiene FK real (work_orders si tiene migracion propia).
--  - quote_id NO tiene FK: la tabla `quotes` existe en la base de datos pero
--    nunca quedo registrada en una migracion de este directorio. Se deja como
--    columna indexada sin CONSTRAINT para no romper una instalacion limpia
--    (001..015 en una base vacia). Cuando exista la migracion de `quotes`,
--    endurecer con un script nuevo que agregue la FK.
--  - Esta migracion solo crea el modelo de datos. La emision/certificacion
--    real contra Digifact (llamada HTTP, mapeo de campos de su API) es un
--    paso posterior; por eso serie_dte/numero_dte/uuid_dte/xml_certificado
--    y digifact_response quedan nullable, se llenan cuando se certifica.
-- =====================================================================

CREATE TABLE invoices (
  id                  INT UNSIGNED NOT NULL AUTO_INCREMENT,
  number              VARCHAR(20)   NOT NULL,                  -- correlativo interno (independiente del numero DTE)
  client_id           INT UNSIGNED  NOT NULL,
  quote_id            INT UNSIGNED  NULL,                      -- cotizacion de origen (sin FK, ver nota arriba)
  work_order_id       INT UNSIGNED  NULL,                      -- orden de trabajo de origen
  tipo_dte            VARCHAR(10)   NOT NULL DEFAULT 'FACT',   -- catalogo SAT: FACT, FCAM, NCRE, NDEB, ...
  moneda              VARCHAR(3)    NOT NULL DEFAULT 'GTQ',
  subtotal            DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  descuento           DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  iva                 DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  total               DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  estado              ENUM('borrador','pendiente','certificado','error','anulado') NOT NULL DEFAULT 'borrador',

  -- Datos que asigna el certificador (Digifact) al emitir el DTE. Nulos hasta certificar.
  serie_dte           VARCHAR(40)   NULL,
  numero_dte          VARCHAR(40)   NULL,
  uuid_dte            CHAR(36)      NULL,                      -- identificador unico de certificacion (SAT)
  fecha_certificacion DATETIME      NULL,
  xml_certificado     LONGTEXT      NULL,
  pdf_url             VARCHAR(500)  NULL,
  digifact_response   JSON          NULL,                      -- payload crudo de la respuesta (auditoria/debug)
  digifact_error      TEXT          NULL,

  -- Anulacion
  motivo_anulacion    VARCHAR(255)  NULL,
  anulado_at          DATETIME      NULL,

  observations        TEXT          NULL,
  created_at          DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_invoices_number (number),
  UNIQUE KEY uq_invoices_uuid (uuid_dte),
  KEY idx_invoices_client (client_id),
  KEY idx_invoices_quote (quote_id),
  KEY idx_invoices_work_order (work_order_id),
  KEY idx_invoices_estado (estado),
  CONSTRAINT fk_invoices_client FOREIGN KEY (client_id) REFERENCES clients (id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_invoices_work_order FOREIGN KEY (work_order_id) REFERENCES work_orders (id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE invoice_items (
  id          INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  invoice_id  INT UNSIGNED  NOT NULL,
  description VARCHAR(255)  NOT NULL,
  quantity    DECIMAL(10,2) NOT NULL DEFAULT 1.00,
  unit_price  DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  subtotal    DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  PRIMARY KEY (id),
  KEY idx_invoice_items_invoice (invoice_id),
  CONSTRAINT fk_invoice_items_invoice FOREIGN KEY (invoice_id) REFERENCES invoices (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
