-- =====================================================================
-- 017_invoice_items_type.sql  -  Tipo de linea en facturas
-- Digifact exige por item si es "Bien" o "Servicio" (afecta UnitOfMeasure
-- y el tratamiento fiscal). Ejecutar despues de 016_invoices_seed.sql
-- =====================================================================

ALTER TABLE invoice_items
  ADD COLUMN item_type ENUM('bien','servicio') NOT NULL DEFAULT 'servicio' AFTER description;
