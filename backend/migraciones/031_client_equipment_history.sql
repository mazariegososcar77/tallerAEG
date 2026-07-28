-- =====================================================================
-- 031_client_equipment_history.sql  -  Historial de equipo por cliente
-- Amarra work_orders y service_orders a una maquina real del catalogo
-- (machines), para poder armar la linea de tiempo de un equipo especifico
-- a traves de sus cotizaciones/ordenes/visitas -- hoy esos 3 solo guardan
-- el nombre/marca/modelo/serie como texto libre, sin relacion entre si.
--
-- machine_id es NULL-able a proposito: los registros existentes se quedan
-- sin vincular (no hay forma confiable de adivinar a que maquina pertenecen
-- retroactivamente) y el formulario sigue funcionando igual si el usuario
-- prefiere escribir el equipo a mano en vez de elegir uno del catalogo.
--
-- quotes.equipment_data no necesita migracion: ya es JSON, cada elemento
-- del arreglo gana una key opcional "machine_id" sin tocar el esquema.
-- =====================================================================

ALTER TABLE work_orders
  ADD COLUMN machine_id INT UNSIGNED NULL AFTER client_id,
  ADD CONSTRAINT fk_wo_machine FOREIGN KEY (machine_id) REFERENCES machines(id) ON DELETE SET NULL;

ALTER TABLE service_orders
  ADD COLUMN machine_id INT UNSIGNED NULL AFTER client_id,
  ADD CONSTRAINT fk_so_machine FOREIGN KEY (machine_id) REFERENCES machines(id) ON DELETE SET NULL;
