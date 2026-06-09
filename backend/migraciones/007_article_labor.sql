-- =====================================================================
-- 007_article_labor.sql  -  Mano de obra de un articulo
-- Cada articulo puede tener N items de mano de obra (tareas/servicios).
-- MySQL 8 / InnoDB / utf8mb4. Ejecutar despues de 006_article_pieces.sql
-- =====================================================================

CREATE TABLE article_labor (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  article_id  INT UNSIGNED NOT NULL,
  name        VARCHAR(190) NOT NULL,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_article_labor_article (article_id),
  CONSTRAINT fk_article_labor_article
    FOREIGN KEY (article_id) REFERENCES articles (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
