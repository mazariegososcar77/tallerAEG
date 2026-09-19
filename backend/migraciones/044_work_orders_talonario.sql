-- =====================================================================
-- 044_work_orders_talonario.sql  -  Orden de Trabajo = el talonario, campo por campo
-- Alinea la Orden de Trabajo con el talonario fisico A.E.G. (mismos campos,
-- mismo orden). Lo que faltaba respecto al papel:
--   * Codigo (arriba a la derecha del talonario).
--   * Cambio de cojinetes usa DOS medidas en mm (bearings_mm ya era la primera).
--   * "Torno:" (texto libre) y "Otros" de la fila de fisica/torno.
--   * "bomba marca", distinta de la marca del motor.
--
-- Estados: se agrega 'garantia' y 'cancelado' pasa a llamarse 'devolucion'
-- (las ordenes que estaban canceladas quedan como devolucion). Se hace en tres
-- pasos porque MySQL no deja quitar un valor de un ENUM mientras alguna fila lo
-- use: ensanchar, migrar los datos, y recien ahi angostar.
--
-- OJO: lo que cambia en las pantallas y el PDF (Conexion/Temperatura con tres
-- cajas, tipos de equipo como casillas, 110V) NO necesita columnas nuevas: viven
-- dentro de los JSON que ya existian (equipment_type, measurement_intake,
-- measurement_delivery), y el codigo tolera el formato viejo.
--
-- Ejecutar despues de 043_client_contacts.sql
-- =====================================================================

ALTER TABLE work_orders
  ADD COLUMN code           VARCHAR(60)  NULL AFTER number,
  ADD COLUMN bearings_mm_2  VARCHAR(30)  NULL AFTER bearings_mm,
  ADD COLUMN lathe_note     VARCHAR(255) NULL AFTER lathe_hp,
  ADD COLUMN physical_other VARCHAR(255) NULL AFTER lathe_note,
  ADD COLUMN pump_brand     VARCHAR(120) NULL AFTER pump_bm;

ALTER TABLE work_orders
  MODIFY COLUMN status ENUM('recibido','en_proceso','listo','entregado','cancelado','garantia','devolucion')
    NOT NULL DEFAULT 'recibido';

UPDATE work_orders SET status = 'devolucion' WHERE status = 'cancelado';

ALTER TABLE work_orders
  MODIFY COLUMN status ENUM('recibido','en_proceso','listo','entregado','garantia','devolucion')
    NOT NULL DEFAULT 'recibido';
