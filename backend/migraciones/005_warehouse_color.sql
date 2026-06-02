-- =====================================================================
-- 005_warehouse_color.sql  -  Color para las bodegas
-- Permite mostrar un indicador de color por bodega en el inventario.
-- Ejecutar despues de 004_inventory_seed.sql
-- =====================================================================

ALTER TABLE warehouses
  ADD COLUMN color VARCHAR(7) NOT NULL DEFAULT '#16285C' AFTER description;

-- Colores de las bodegas sembradas
UPDATE warehouses SET color = '#16285C' WHERE id = 1;
UPDATE warehouses SET color = '#E8551C' WHERE id = 2;
