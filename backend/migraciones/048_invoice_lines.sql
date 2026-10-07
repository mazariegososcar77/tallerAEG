-- =====================================================================
-- 048_invoice_lines.sql  -  Lineas y montos correctos en la factura FEL
--   * work_orders.quote_equipment_index: a que equipo de la cotizacion corresponde la orden.
--     Una cotizacion con varios equipos genera una orden por equipo, y la factura de cada
--     orden debe llevar solo las lineas de SU equipo. Sin este dato se copiaban las de todos
--     y a la SAT se certificaba el total de la cotizacion completa en cada factura. Queda NULL
--     en las ordenes viejas; para esas el sistema reconoce el equipo por sus datos
--     (ver backend/src/lib/invoiceLines.js).
--   * invoice_items.item_type: Bien o Servicio ante la SAT (regla 2.3.8). Repuesto = bien,
--     mano de obra = servicio. Las lineas ya existentes quedan como servicio, igual que antes.
--   * invoices.fel_pending_since: se marca justo antes de mandar la factura a Digifact y se
--     limpia al recibir respuesta. Si queda puesta, el intento anterior se quedo sin respuesta
--     y la SAT pudo haberla emitido: no se reintenta sin confirmarlo (invoiceService.certify).
-- Ejecutar despues de 047_invoice_fel.sql
-- =====================================================================

ALTER TABLE work_orders
  ADD COLUMN quote_equipment_index INT UNSIGNED NULL AFTER quote_id;

ALTER TABLE invoice_items
  ADD COLUMN item_type ENUM('bien','servicio') NOT NULL DEFAULT 'servicio' AFTER invoice_id;

ALTER TABLE invoices
  ADD COLUMN fel_pending_since DATETIME NULL AFTER fel_environment;
