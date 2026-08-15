-- =====================================================================
-- 038_articles_min_stock.sql  -  Punto de reorden por articulo
-- Agrega articles.min_stock: el nivel de existencia por debajo del cual un
-- articulo se considera "stock bajo". 0 (el default) significa que ese
-- articulo no genera alerta de stock bajo -- no todos los articulos la
-- necesitan (ej. mano de obra, servicios, articulos que no se reponen).
--
-- Es la base de datos que va a consultar n8n via Cron para las
-- notificaciones de reorden; esta migracion NO crea ningun workflow ni
-- endpoint de alertas todavia, solo el dato.
--
-- MySQL 8 / InnoDB / utf8mb4. Ejecutar despues de 037_work_report_photo_categories.sql
-- =====================================================================

ALTER TABLE articles
  ADD COLUMN min_stock DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER quantity;
