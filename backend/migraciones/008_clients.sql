-- =====================================================================
-- 008_clients.sql  -  Modulo de Clientes
-- Tablas: client_types (tipos de cliente), loyalty_tiers (fidelizacion), clients
-- MySQL 8 / InnoDB / utf8mb4. Ejecutar despues de 007_article_labor.sql
-- =====================================================================

CREATE TABLE client_types (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name        VARCHAR(150) NOT NULL,
  description VARCHAR(255) NOT NULL DEFAULT '',
  is_active   TINYINT(1)   NOT NULL DEFAULT 1,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_client_types_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Niveles de fidelizacion: nivel (name), descuento (%) y beneficios.
CREATE TABLE loyalty_tiers (
  id          INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  name        VARCHAR(150)  NOT NULL,
  discount    DECIMAL(5,2)  NOT NULL DEFAULT 0,
  benefits    TEXT          NULL,
  is_active   TINYINT(1)    NOT NULL DEFAULT 1,
  created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_loyalty_tiers_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Al menos uno de nit/dpi debe venir (regla aplicada en la capa de servicio).
CREATE TABLE clients (
  id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  nit             VARCHAR(20)  NULL,
  dpi             VARCHAR(20)  NULL,
  first_name      VARCHAR(120) NOT NULL,
  last_name       VARCHAR(120) NOT NULL,
  email           VARCHAR(190) NOT NULL DEFAULT '',
  address         VARCHAR(255) NOT NULL DEFAULT '',
  phone           VARCHAR(40)  NOT NULL,
  client_type_id  INT UNSIGNED NULL,
  loyalty_tier_id INT UNSIGNED NULL,
  is_active       TINYINT(1)   NOT NULL DEFAULT 1,
  created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_clients_nit (nit),
  UNIQUE KEY uq_clients_dpi (dpi),
  KEY idx_clients_type (client_type_id),
  KEY idx_clients_loyalty (loyalty_tier_id),
  CONSTRAINT fk_clients_type
    FOREIGN KEY (client_type_id) REFERENCES client_types (id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_clients_loyalty
    FOREIGN KEY (loyalty_tier_id) REFERENCES loyalty_tiers (id)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
