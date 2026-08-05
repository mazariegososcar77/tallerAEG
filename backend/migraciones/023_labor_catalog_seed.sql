-- =====================================================================
-- 023_labor_catalog_seed.sql  -  Catalogos faltantes para "Mano de Obra"
-- components/quotes/ArticleQuickModal.jsx (alta rapida de Mano de Obra
-- desde una cotizacion) siempre creo los articulos con type_id=4 y
-- warehouse_id=3 fijos, pero 004_inventory_seed.sql nunca sembro ese 4to
-- tipo de articulo ni esa 3ra bodega -> el alta rapida fallaba con
-- ER_NO_REFERENCED_ROW ("Uno de los datos seleccionados ya no existe").
-- Este script agrega exactamente esos dos catalogos con esos mismos ids,
-- sin tocar el frontend.
-- Ejecutar despues de 022_work_reports_signatures.sql
-- =====================================================================

INSERT INTO article_types (id, name, description) VALUES
  (4, 'Mano de Obra', 'Servicios y mano de obra (no es un articulo fisico)');

INSERT INTO warehouses (id, name, description, color) VALUES
  (3, 'Servicios', 'Bodega logica para articulos de mano de obra/servicios, sin stock fisico', '#64748b');
