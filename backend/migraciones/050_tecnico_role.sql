-- =====================================================================
-- 050_tecnico_role.sql  -  Rol Tecnico: acceso limitado a OT, Cotizaciones
-- (solo lectura), Reportes de Trabajo e Historial de Clientes.
-- Continua la numeracion de permisos de 049_quotes_workflow.sql (ultimo id: 76).
-- Ejecutar despues de 049_quotes_workflow.sql
-- =====================================================================

-- Ordenes de Trabajo y Cotizaciones compartian hasta ahora el permiso generico
-- "dashboard.view" con Maquinas y Mantenimiento (ver comentarios en
-- workOrderRoutes.js/quoteRoutes.js/machineRoutes.js/maintenanceRoutes.js) -- eso
-- hacia imposible darle a alguien OT/Cotizaciones sin darle tambien Maquinas y
-- Mantenimiento. Se agregan permisos propios para poder separarlos, igual que ya
-- se hizo para Ordenes de Servicio/rol Subcontrato (ver 026_service_orders.sql).
-- "clients.history.view" deja ver el Historial de un cliente especifico sin dar
-- acceso a la lista completa de Clientes (con NIT/DPI/telefono de todos).
INSERT INTO permissions (id, code, description, module) VALUES
  (77, 'work-orders.view',          'Ver ordenes de trabajo',               'Ordenes de Trabajo'),
  (78, 'work-orders.update-status', 'Cambiar el estado de una orden',       'Ordenes de Trabajo'),
  (79, 'quotes.view',               'Ver cotizaciones',                     'Cotizaciones'),
  (80, 'clients.history.view',      'Ver el historial de equipo de un cliente (sin ver la lista completa de clientes)', 'Clientes');

-- Administrador (rol 1) y Operador (rol 2) ya tenian acceso a todo esto via
-- "dashboard.view" -- se les da tambien el permiso nuevo para no perder nada al
-- separar las rutas de OT/Cotizaciones de ese permiso generico.
INSERT INTO role_permissions (role_id, permission_id) VALUES
  (1,77),(1,78),(1,79),
  (2,77),(2,78),(2,79);
-- Consulta (rol 3): solo ver (sin cambiar estado de una orden).
INSERT INTO role_permissions (role_id, permission_id) VALUES
  (3,77),(3,79);
-- Nota: no se agrega "clients.history.view" a 1/2/3 porque los tres ya tienen
-- "clients.view" (009_clients_seed.sql), que tambien deja ver el historial (la
-- ruta acepta cualquiera de los dos permisos).

-- Rol Tecnico (nuevo).
INSERT INTO roles (id, name, description) VALUES
  (4, 'Tecnico', 'Acceso limitado: ordenes de trabajo, cotizaciones (solo ver), reportes de trabajo e historial de clientes');

INSERT INTO role_permissions (role_id, permission_id) VALUES
  (4,77), -- work-orders.view
  (4,78), -- work-orders.update-status
  (4,79), -- quotes.view (solo lectura: no se le da permiso de crear/editar/duplicar/borrar)
  (4,80), -- clients.history.view
  (4,37), -- work-reports.view
  (4,38), -- work-reports.create
  (4,39), -- work-reports.update (notas, fotos, firma y finalizar el reporte)
  (4,61); -- work-report-items.manage (registrar material/repuestos usados)
