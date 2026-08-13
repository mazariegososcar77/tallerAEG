-- =====================================================================
-- 035_stock_movements_seed.sql  -  Arranque del kardex + permisos
-- Reconcilia el kardex con los saldos que articles.quantity ya traia de
-- antes: como esos saldos existen sin ningun historial detras, se les crea
-- un movimiento de apertura 'saldo_inicial' para que desde este punto el
-- kardex cuadre exactamente con articles.quantity. Sin esto, el libro de
-- movimientos arrancaria en cero y nunca casaria con el stock real.
--
-- OJO: como los demas seeds del proyecto (002, 020), este script NO es
-- idempotente -- correrlo dos veces duplicaria los saldos de apertura.
-- Aplicar una sola vez, en orden, igual que el resto de migraciones.
--
-- Permisos nuevos: ids continuando desde 58 (032_system_settings.sql).
-- MySQL 8 / InnoDB / utf8mb4. Ejecutar despues de 034_work_report_items.sql
-- =====================================================================

-- Saldo de apertura por cada articulo que hoy tiene existencias. El costo va
-- con COALESCE(cost, 0): articles.cost acaba de nacer y esta en NULL para
-- todos, y se prefiere un costo desconocido en 0.00 antes que sembrar
-- cost = price (que es precio de venta) y ensuciar el costeo con datos falsos.
-- Los costos reales se capturan despues, articulo por articulo, desde
-- Inventario; los saldos de apertura quedan valuados en 0 a proposito.
INSERT INTO stock_movements
  (article_id, type, quantity, unit_cost, balance_after, reference_type, reference_id, user_id, notes)
SELECT
  a.id,
  'entrada',
  a.quantity,
  COALESCE(a.cost, 0),
  a.quantity,
  'saldo_inicial',
  NULL,
  NULL,
  'Saldo de apertura al activar el kardex'
FROM articles a
WHERE a.quantity > 0;

-- Permisos nuevos.
INSERT INTO permissions (id, code, description, module) VALUES
  (59, 'inventory-movements.view',   'Ver el kardex de movimientos de inventario',      'Inventario'),
  (60, 'inventory-movements.create', 'Registrar ajustes manuales de inventario',        'Inventario'),
  (61, 'work-report-items.manage',   'Agregar y quitar materiales usados en un reporte','Reportes');

-- Rol 1 (Administrador): todo.
INSERT INTO role_permissions (role_id, permission_id) VALUES
  (1,59),(1,60),(1,61);
-- Rol 2 (Operador): ve el kardex y carga el material que uso en un reporte,
-- pero NO puede hacer ajustes manuales de existencias (eso descuadra el
-- inventario sin un trabajo que lo respalde: queda solo para Administrador).
INSERT INTO role_permissions (role_id, permission_id) VALUES
  (2,59),(2,61);
-- Rol 3 (Consulta): solo ver.
INSERT INTO role_permissions (role_id, permission_id) VALUES
  (3,59);
