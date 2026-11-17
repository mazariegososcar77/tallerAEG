-- =====================================================================
-- 054_tecnico_crear_maquina.sql  -  El rol Tecnico puede registrar una
-- maquina nueva de un cliente (hasta ahora solo podia VER el catalogo para
-- elegir una existente, "machines.view" de 051_tecnico_crear_ot_post.sql).
-- Sin esto, el boton "+ Nueva maquina" del MachinePicker (usado al crear una
-- Orden de Trabajo/Cotizacion) se ve pero el guardado responde 403 -- un
-- Tecnico en campo que recibe un equipo de un cliente nuevo (aun pendiente
-- de validar) no podia registrar esa maquina por su cuenta.
-- Continua la numeracion de 053_segundo_cojinete.sql (ultimo id: 82).
-- Ejecutar despues de 053_segundo_cojinete.sql
-- =====================================================================

-- No se reutiliza "dashboard.view" (lo que ya exige editar/borrar una maquina,
-- o gestionar el catalogo completo de Maquinas/Mantenimiento) porque esto debe
-- darse SOLO para crear.
INSERT INTO permissions (id, code, description, module) VALUES
  (83, 'machines.create', 'Crear maquinas', 'Maquinas');

-- Administrador (rol 1) y Operador (rol 2) ya pueden crear maquinas via
-- "dashboard.view"; se les da tambien este permiso para no perder nada al
-- separar la ruta de creacion de ese permiso generico.
INSERT INTO role_permissions (role_id, permission_id) VALUES
  (1,83),(2,83);

-- Rol Tecnico: puede registrar una maquina nueva, pero sigue sin poder
-- editar/borrar del catalogo ni entrar a Mantenimiento (eso sigue siendo
-- "dashboard.view").
INSERT INTO role_permissions (role_id, permission_id) VALUES
  (4,83);
