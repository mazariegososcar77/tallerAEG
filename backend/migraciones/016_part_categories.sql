-- =====================================================================
-- 016_part_categories.sql  -  Catalogo de categorias de pieza (catch-up)
-- Igual que 015_quotes.sql: la tabla ya se usaba desde
-- partCategoryRepository.js sin migracion. IF NOT EXISTS para no romper
-- instalaciones donde ya exista a mano.
-- MySQL 8 / InnoDB / utf8mb4. Ejecutar despues de 015_quotes.sql
-- =====================================================================

CREATE TABLE IF NOT EXISTS part_categories (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name        VARCHAR(150) NOT NULL,
  prefix      VARCHAR(10)  NOT NULL,
  is_active   TINYINT(1)   NOT NULL DEFAULT 1,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_part_categories_name (name),
  UNIQUE KEY uq_part_categories_prefix (prefix)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
