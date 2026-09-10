-- =====================================================================
-- 017_work_orders_quote_link.sql  -  Vincula orden de trabajo <- cotizacion
-- Permite crear una orden a partir de una cotizacion aprobada, guardando
-- la trazabilidad real (no solo copiar datos). Si la cotizacion se borra,
-- la orden ya creada se conserva (quote_id queda NULL).
-- Ejecutar despues de 016_part_categories.sql
-- =====================================================================

ALTER TABLE work_orders
  ADD COLUMN quote_id INT UNSIGNED NULL AFTER id,
  ADD KEY idx_wo_quote (quote_id),
  ADD CONSTRAINT fk_wo_quote FOREIGN KEY (quote_id) REFERENCES quotes (id)
    ON DELETE SET NULL ON UPDATE CASCADE;
