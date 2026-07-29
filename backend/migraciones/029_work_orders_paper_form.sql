-- =====================================================================
-- 029_work_orders_paper_form.sql  -  Orden de Trabajo = talonario fisico completo
-- Completa la Orden de Trabajo digital con las secciones del talonario real
-- que todavia no existian: encabezado (proximo servicio, falla/problema),
-- trabajo a realizar (checkboxes multiples), tipo de equipo, datos de bomba,
-- fisica/motor, tornillos, medicion (ingreso y entrega) y cierre. Los grupos
-- de checkboxes y las tablas de filas fijas se guardan como JSON (mismo
-- patron que quotes.equipment_data / service_orders.installed_components)
-- en vez de decenas de columnas sueltas.
--
-- NO se duplican los campos de precio (torno_price/parts_price/labor_price/
-- labor_article_id): ya existian desde 025_work_orders_flow_pricing.sql.
-- NO se toca el checklist de componentes (work_order_items): ya cubre
-- exactamente los 20 items del talonario.
-- Ejecutar despues de 028_service_order_field_report.sql
-- =====================================================================

ALTER TABLE work_orders
  -- 1. Encabezado
  ADD COLUMN next_service_at DATE NULL AFTER delivery_at,
  ADD COLUMN reported_problem TEXT NULL AFTER next_service_at,

  -- 2. Trabajo a realizar (checkboxes, multi-seleccion). La columna "work_type"
  -- (single-select) se queda igual -- la sigue usando el prellenado automatico
  -- desde Cotizaciones (applyQuoteEquip en WorkOrderFormPage.jsx).
  ADD COLUMN work_types JSON NULL AFTER work_type,

  -- 3. Tipo de equipo (categoria + subtipos marcados con checkbox)
  ADD COLUMN equipment_type JSON NULL AFTER equipment_name,

  -- 4. Datos del equipo -- especificos de bomba
  ADD COLUMN pump_impeller VARCHAR(60) NULL AFTER frame,
  ADD COLUMN pump_bm VARCHAR(60) NULL AFTER pump_impeller,
  ADD COLUMN pump_seal_size VARCHAR(60) NULL AFTER pump_bm,
  ADD COLUMN pump_seal_type ENUM('viton','nitrilo','conico') NULL AFTER pump_seal_size,

  -- 5. Fisica / Motor
  ADD COLUMN physical_parts JSON NULL AFTER pump_seal_type,
  ADD COLUMN retainers_count VARCHAR(30) NULL AFTER physical_parts,
  ADD COLUMN shaft_rectify_mm VARCHAR(30) NULL AFTER retainers_count,
  ADD COLUMN bearings_count VARCHAR(30) NULL AFTER shaft_rectify_mm,
  ADD COLUMN bearings_mm VARCHAR(30) NULL AFTER bearings_count,
  ADD COLUMN seal_liner_mm VARCHAR(30) NULL AFTER bearings_mm,
  ADD COLUMN front_cover_mm VARCHAR(30) NULL AFTER seal_liner_mm,
  ADD COLUMN rear_cover_mm VARCHAR(30) NULL AFTER front_cover_mm,
  ADD COLUMN fan_hole_mm VARCHAR(30) NULL AFTER rear_cover_mm,
  -- Especificaciones tecnicas del torno (NO es precio -- eso ya existe en torno_price).
  ADD COLUMN lathe_kw VARCHAR(30) NULL AFTER fan_hole_mm,
  ADD COLUMN lathe_hp VARCHAR(30) NULL AFTER lathe_kw,

  -- 6. Tornillos: 14 filas fijas (10 "por parte" + 4 "sueltos"), cantidad cada una.
  ADD COLUMN screws JSON NULL AFTER lathe_hp,

  -- 8. Medicion: dos bloques (mismo formato, uno por cada momento: como ingresa / como se entrega).
  ADD COLUMN measurement_intake JSON NULL AFTER screws,
  ADD COLUMN measurement_delivery JSON NULL AFTER measurement_intake,

  -- 10. Cierre
  ADD COLUMN supervisor_aeg_receive VARCHAR(150) NULL AFTER tech_assemble,
  ADD COLUMN supervisor_aeg_deliver VARCHAR(150) NULL AFTER supervisor_aeg_receive,
  ADD COLUMN supervisor_client_deliver VARCHAR(150) NULL AFTER supervisor_aeg_deliver,
  ADD COLUMN supervisor_client_receive VARCHAR(150) NULL AFTER supervisor_client_deliver,
  ADD COLUMN shipping VARCHAR(150) NULL AFTER supervisor_client_receive,
  ADD COLUMN whatsapp_number VARCHAR(30) NULL AFTER shipping;
