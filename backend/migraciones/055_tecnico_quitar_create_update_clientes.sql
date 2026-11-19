-- =====================================================================
-- 055_tecnico_quitar_create_update_clientes.sql  -  El rol Tecnico NO debe
-- poder crear ni editar clientes "completos" -- solo la alta rapida sin
-- validar (clients.quick-create, desde el ClientPicker de Ordenes/
-- Cotizaciones). Una revision encontro que el rol tenia de mas
-- "clients.create" (24) y "clients.update" (25), que ninguna migracion le
-- habia asignado nunca (quedaron marcados por accidente en Modo avanzado
-- del editor de Roles). Se quitan; el rol conserva "clients.view" (entra a
-- /clientes y ve la lista), "clients.quick-create" y
-- "clients.history.view".
-- Ejecutar despues de 054_tecnico_crear_maquina.sql
-- =====================================================================

DELETE FROM role_permissions
WHERE role_id = 4 AND permission_id IN (24, 25); -- clients.create, clients.update
