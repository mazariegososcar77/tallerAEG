-- =====================================================================
-- 055_tecnico_crear_clientes.sql  -  El rol Tecnico puede crear clientes
-- desde la pantalla de Clientes (alta completa, con NIT/DPI y telefono
-- obligatorios -- distinto de "clients.quick-create", la alta rapida desde
-- el selector de Ordenes/Cotizaciones, que deja el cliente sin validar).
-- Ya tenia "clients.view" (051_tecnico_crear_ot_post.sql), que es lo que
-- deja entrar a /clientes; sin "clients.create" el boton "Nuevo cliente"
-- de esa pantalla no se mostraba.
-- Continua la numeracion de 054_tecnico_crear_maquina.sql (ultimo id: 83;
-- "clients.create" ya existia, id 24, 009_clients_seed.sql -- no hace falta
-- permiso nuevo, solo el mapeo a rol).
-- Ejecutar despues de 054_tecnico_crear_maquina.sql
-- =====================================================================

INSERT INTO role_permissions (role_id, permission_id) VALUES
  (4,24); -- clients.create
