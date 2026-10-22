-- =====================================================================
-- 051_tecnico_crear_ot_post.sql  -  El rol Tecnico puede crear Ordenes de
-- Trabajo del flujo Post (el equipo se desarma sin cotizacion previa, asi que
-- la orden la abre quien recibe el equipo -- el propio Tecnico).
-- Continua la numeracion de 050_tecnico_role.sql (ultimo id: 80).
-- Ejecutar despues de 050_tecnico_role.sql
-- =====================================================================

-- No se reutiliza "dashboard.view" (lo que ya exige crear/editar/borrar una OT)
-- porque esto debe darse SOLO para crear, y SOLO para el flujo Post -- la
-- restriccion de que sea Post se aplica en workOrderService.create, no aqui.
INSERT INTO permissions (id, code, description, module) VALUES
  (81, 'work-orders.create', 'Crear ordenes de trabajo (flujo Post)', 'Ordenes de Trabajo');

-- Administrador (rol 1) y Operador (rol 2) ya pueden crear OT via "dashboard.view";
-- se les da tambien este permiso para no perder nada al separar la ruta de creacion.
INSERT INTO role_permissions (role_id, permission_id) VALUES
  (1,81),(2,81);

-- Rol Tecnico: puede crear OT, pero el service solo lo deja si flow_type='post'
-- (no tiene "dashboard.view", asi que no puede crear del flujo Pre).
INSERT INTO role_permissions (role_id, permission_id) VALUES
  (4,81);

-- El formulario de "Nueva Orden" necesita, ademas de crear, varios catalogos de solo
-- lectura para que sus selectores funcionen (si no, se quedan vacios o la pantalla ni
-- carga porque alguna de estas peticiones responde 403):
--   - ClientPicker carga clientsApi.list() -> "clients.view" (23, 009_clients_seed.sql).
--     Esto hace que el Tecnico tambien pueda entrar a /clientes y ver la lista completa --
--     se acepta como costo necesario, no hay hoy un endpoint de busqueda mas acotado.
--   - El selector de "Tipo de cliente" (para dar de alta un cliente nuevo) -> "client-types.view" (27).
--   - El selector de "Fidelizacion" (idem) -> "loyalty.view" (31).
--   - useEquipmentTypes() (el tipo de equipo del talonario) -> "equipment-types.view" (71).
INSERT INTO role_permissions (role_id, permission_id) VALUES
  (4,23),(4,27),(4,31),(4,71);

-- MachinePicker (elegir la maquina del cliente) carga machinesApi.list(), que hasta ahora
-- exigia el generico "dashboard.view" -- igual que paso con OT/Cotizaciones, eso obligaria a
-- darle tambien Maquinas y Mantenimiento completos al Tecnico solo para poder crear una orden.
-- Se separa "ver" en su propio permiso, igual que ya se hizo para work-orders.view/quotes.view
-- (ver 050_tecnico_role.sql); crear/editar/borrar una maquina sigue siendo "dashboard.view".
INSERT INTO permissions (id, code, description, module) VALUES
  (82, 'machines.view', 'Ver maquinas', 'Maquinas');

-- Administrador/Operador/Consulta ya veian maquinas via "dashboard.view"; se les da tambien
-- este permiso para no perder nada al separar la ruta de "ver" de ese permiso generico.
INSERT INTO role_permissions (role_id, permission_id) VALUES
  (1,82),(2,82),(3,82);

-- Rol Tecnico: solo ver (elegir la maquina del cliente en el formulario), no gestionar
-- el catalogo de maquinas ni Mantenimiento -- esos siguen siendo "dashboard.view".
INSERT INTO role_permissions (role_id, permission_id) VALUES
  (4,82);
