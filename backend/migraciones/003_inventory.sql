-- =====================================================================
-- 003_inventory.sql  -  Modulo de Inventario
-- Tablas: warehouses (bodegas), article_types (tipos), articles (articulos)
-- MySQL 8 / InnoDB / utf8mb4. Ejecutar despues de 002_seed.sql
-- =====================================================================

CREATE TABLE warehouses (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name        VARCHAR(150) NOT NULL,
  description VARCHAR(255) NOT NULL DEFAULT '',
  is_active   TINYINT(1)   NOT NULL DEFAULT 1,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_warehouses_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE article_types (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name        VARCHAR(150) NOT NULL,
  description VARCHAR(255) NOT NULL DEFAULT '',
  is_active   TINYINT(1)   NOT NULL DEFAULT 1,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_article_types_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE articles (
  id           INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  code         VARCHAR(60)   NOT NULL,
  name         VARCHAR(190)  NOT NULL,
  type_id      INT UNSIGNED  NOT NULL,
  warehouse_id INT UNSIGNED  NOT NULL,
  quantity     DECIMAL(12,2) NOT NULL DEFAULT 0,
  unit         VARCHAR(30)   NOT NULL DEFAULT 'unidad',
  price        DECIMAL(12,2) NOT NULL DEFAULT 0,
  brand        VARCHAR(120)  NOT NULL DEFAULT '',
  model        VARCHAR(120)  NOT NULL DEFAULT '',
  location     VARCHAR(120)  NOT NULL DEFAULT '',
  description  TEXT          NULL,
  image_url    VARCHAR(500)  NOT NULL DEFAULT '',
  is_active    TINYINT(1)    NOT NULL DEFAULT 1,
  created_at   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_articles_code (code),
  KEY idx_articles_type (type_id),
  KEY idx_articles_warehouse (warehouse_id),
  CONSTRAINT fk_articles_type
    FOREIGN KEY (type_id) REFERENCES article_types (id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_articles_warehouse
    FOREIGN KEY (warehouse_id) REFERENCES warehouses (id)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
