-- =====================================================================
-- 057_clients_office_phone.sql  -  Telefono de oficina del cliente
-- Campo nuevo, opcional (nunca obligatorio, a diferencia de `phone`), para un
-- segundo numero de contacto del cliente (ej. la oficina, cuando "phone" ya
-- es el celular de la persona de contacto).
-- MySQL 8 / InnoDB / utf8mb4. Ejecutar despues de 056_client_projects.sql
-- =====================================================================

ALTER TABLE clients
  ADD COLUMN office_phone VARCHAR(40) NULL AFTER phone;
