-- =====================================================================
-- 035_stock_movements_seed.sql  -  Arranque del kardex + permisos
-- Reconcilia el kardex con los saldos que articles.quantity ya traia de
-- antes: como esos saldos existen sin ningun historial detras, se les crea
-- un movimiento de apertura 'saldo_inicial' para que desde este punto el
-- kardex cuadre exactamente con articles.quantity. Sin esto, el libro de
-- movimientos arrancaria en cero y nunca casaria con el stock real.
--
-- Los saldos de apertura SI son idempotentes (ver el NOT EXISTS de abajo): solo
-- se siembra al articulo que todavia no tiene una apertura registrada. Hace
-- falta porque desde que dar de alta un articulo con existencia genera su propio
-- movimiento 'saldo_inicial' (articleService.create), entre el despliegue de ese
-- cambio y la corrida de este script alguien pudo haber creado articulos con
-- cantidad: sin la guarda, este SELECT los volveria a agarrar -- tienen
-- quantity > 0 -- y les meteria una segunda apertura, dejando el kardex en 2X
-- contra una existencia real de X y el doble conteo en cualquier reporte que
-- sume movimientos. La guarda tambien vuelve inofensivo re-correr el script.
--
-- OJO: los INSERT de permisos de mas abajo NO llevan guarda, igual que en los
-- demas seeds del proyecto (002, 020): correr el script dos veces fallaria ahi
-- por clave duplicada. Aplicar una sola vez, en orden, igual que el resto.
--
-- Permisos nuevos: ids continuando desde 58 (032_system_settings.sql).
-- MySQL 8 / InnoDB / utf8mb4. Ejecutar despues de 034_work_report_items.sql
-- =====================================================================

-- Saldo de apertura por cada articulo que hoy tiene existencias, valuado con
-- COALESCE(cost, 0).
--
-- De ahi que convenga capturar los costos de compra ANTES de correr este
-- script: al articulo que ya tenga su costo, la apertura le queda valuada de
-- verdad; al que no, en 0.00, y esa valuacion ya no se corrige sola despues
-- (cambiar articles.cost mas adelante no reescribe los movimientos, que son
-- historico). Lo que NO se hace nunca es rellenar con cost = price: price es
-- precio de VENTA, y sembrarlo como costo ensuciaria el costeo de todos los
-- trabajos con un dato falso. Un 0.00 es un "costo desconocido" honesto.
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
WHERE a.quantity > 0
  -- Solo a quien no tenga ya su apertura: un articulo creado despues del
  -- despliegue del kardex ya la trae desde el alta (ver cabecera).
  AND NOT EXISTS (
    SELECT 1 FROM stock_movements m
    WHERE m.article_id = a.id
      AND m.reference_type = 'saldo_inicial'
  );

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
