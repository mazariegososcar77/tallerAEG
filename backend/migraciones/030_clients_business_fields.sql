-- =====================================================================
-- 030_clients_business_fields.sql  -  Completa columnas de Empresa/Gobierno en clients
-- El frontend (ClientFormModal.jsx) y clientService.js (funcion normalize) ya
-- esperaban estas 4 columnas para las categorias "Empresa" y "Gobierno" del
-- formulario de clientes, pero la migracion nunca se creo -- causaba un 500
-- ("Unknown column 'trade_name'") al intentar crear CUALQUIER cliente, sin
-- importar la categoria.
-- =====================================================================

ALTER TABLE clients
  ADD COLUMN company_name VARCHAR(255) NULL AFTER last_name,
  ADD COLUMN trade_name VARCHAR(255) NULL AFTER company_name,
  ADD COLUMN contact_name VARCHAR(150) NULL AFTER trade_name,
  ADD COLUMN dependency VARCHAR(150) NULL AFTER contact_name;
