-- =====================================================================
-- 015_quotes.sql  -  Modulo de Cotizaciones (catch-up)
-- Las tablas quotes/quote_items ya se usaban desde el codigo
-- (quoteRepository.js/quoteService.js) sin tener una migracion que las
-- creara. Este script cierra ese vacio; usa IF NOT EXISTS para poder
-- correr sin romper instalaciones donde ya existan a mano.
-- MySQL 8 / InnoDB / utf8mb4. Ejecutar despues de 014_clients_validation.sql
-- =====================================================================

CREATE TABLE IF NOT EXISTS quotes (
  id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  number          VARCHAR(20)  NOT NULL,
  client_id       INT UNSIGNED NOT NULL,
  date            DATE         NOT NULL,
  valid_until     DATE         NULL,
  status          ENUM('borrador','enviada','aprobada','rechazada','vencida') NOT NULL DEFAULT 'borrador',
  work_type       VARCHAR(255) NULL,
  observations    TEXT         NULL,
  equipment_data  JSON         NULL,      -- [{name,brand,model,serial}, ...] por equipo
  discount        DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  subtotal        DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  total           DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_quotes_number (number),
  KEY idx_quotes_client (client_id),
  KEY idx_quotes_status (status),
  CONSTRAINT fk_quotes_client FOREIGN KEY (client_id) REFERENCES clients (id)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Lineas de mano de obra / repuestos por equipo (equipment_index referencia
-- la posicion dentro de equipment_data).
CREATE TABLE IF NOT EXISTS quote_items (
  id               INT UNSIGNED NOT NULL AUTO_INCREMENT,
  quote_id         INT UNSIGNED NOT NULL,
  equipment_index  INT UNSIGNED NOT NULL DEFAULT 0,
  item_type        ENUM('labor','part') NOT NULL DEFAULT 'labor',
  description      VARCHAR(255) NOT NULL,
  quantity         DECIMAL(10,2) NOT NULL DEFAULT 1,
  unit_price       DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  subtotal         DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  PRIMARY KEY (id),
  KEY idx_qi_quote (quote_id),
  CONSTRAINT fk_quote_items_quote FOREIGN KEY (quote_id) REFERENCES quotes (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
