-- =====================================================================
-- 006_article_pieces.sql  -  Piezas de un articulo
-- Cada articulo puede tener N piezas (productos/items que lo componen).
-- MySQL 8 / InnoDB / utf8mb4. Ejecutar despues de 005_warehouse_color.sql
-- =====================================================================

CREATE TABLE article_pieces (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  article_id  INT UNSIGNED NOT NULL,
  name        VARCHAR(190) NOT NULL,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_article_pieces_article (article_id),
  CONSTRAINT fk_article_pieces_article
    FOREIGN KEY (article_id) REFERENCES articles (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
