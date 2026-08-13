-- =====================================================================
-- 034_work_report_items.sql  -  Material consumido en un reporte de trabajo
-- Es la lista de repuestos/insumos que REALMENTE se usaron en el trabajo
-- (10 mts de alambre de cobre, 2 cojinetes, un bote de pintura...), a
-- diferencia de work_order_items, que es solo el checklist en papel de las
-- piezas con las que entro el equipo y no tiene vinculo con inventario.
--
-- Al finalizar el reporte, cada linea de aqui genera un movimiento 'salida'
-- en stock_movements y descuenta el stock (ver inventoryService).
--
-- Aplica igual a reportes de Orden de Trabajo y de Orden de Servicio: la FK
-- es contra work_reports, que ya cubre ambos casos (026_service_orders.sql).
-- En Ordenes de Servicio la seccion de materiales es opcional -- un
-- subcontrato puede no consumir nada de bodega.
--
-- MySQL 8 / InnoDB / utf8mb4. Ejecutar despues de 033_stock_movements.sql
-- =====================================================================

CREATE TABLE work_report_items (
  id             INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  work_report_id INT UNSIGNED  NOT NULL,
  article_id     INT UNSIGNED  NOT NULL,
  quantity       DECIMAL(12,2) NOT NULL DEFAULT 1,
  -- Snapshot del costo al momento de consumirlo: si manana cambia
  -- articles.cost, lo que costo este trabajo no debe cambiar retroactivamente
  -- (mismo criterio que invoice_items con los precios).
  unit_cost      DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  subtotal       DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  created_at     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  -- Un articulo no puede aparecer dos veces en el mismo reporte: si se agrega
  -- de nuevo, se suma la cantidad a la linea existente. Asi el consumo neto
  -- por articulo es una sola fila y no hay que consolidar al descontar.
  UNIQUE KEY uq_wri_report_article (work_report_id, article_id),
  KEY idx_wri_article (article_id),
  CONSTRAINT fk_wri_report FOREIGN KEY (work_report_id) REFERENCES work_reports (id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  -- RESTRICT: un articulo ya consumido en un reporte no se puede borrar del
  -- catalogo; queda el historico de que se uso.
  CONSTRAINT fk_wri_article FOREIGN KEY (article_id) REFERENCES articles (id)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
