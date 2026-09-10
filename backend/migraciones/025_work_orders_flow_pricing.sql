-- =====================================================================
-- 025_work_orders_flow_pricing.sql  -  Flujos Pre/Post + precios de Post
-- Etiqueta cada orden de trabajo como flujo "pre" (cotizacion antes de la
-- orden, el flujo de siempre) o "post" (el motor se desarma sin saber que
-- trae, no hay cotizacion previa). Para "post" se agregan 3 campos de
-- precio estimado (torno, repuestos, mano de obra) que no existian en
-- ningun lado -- el resto de work_orders sigue igual, "pre" no muestra
-- ningun precio (regla de negocio ya existente, ver backend/CLAUDE.md).
-- labor_article_id reusa el catalogo de Mano de Obra que ya existe en
-- articles (type_id=4, sembrado en 023_labor_catalog_seed.sql).
-- Ejecutar despues de 024_part_categories_management.sql
-- =====================================================================

ALTER TABLE work_orders
  ADD COLUMN flow_type ENUM('pre','post') NOT NULL DEFAULT 'pre' AFTER quote_id,
  ADD COLUMN torno_price DECIMAL(10,2) NULL AFTER flow_type,
  ADD COLUMN parts_price DECIMAL(10,2) NULL AFTER torno_price,
  ADD COLUMN labor_article_id INT UNSIGNED NULL AFTER parts_price,
  ADD COLUMN labor_price DECIMAL(10,2) NULL AFTER labor_article_id,
  ADD KEY idx_wo_flow_type (flow_type),
  ADD CONSTRAINT fk_wo_labor_article FOREIGN KEY (labor_article_id) REFERENCES articles (id)
    ON DELETE SET NULL ON UPDATE CASCADE;
