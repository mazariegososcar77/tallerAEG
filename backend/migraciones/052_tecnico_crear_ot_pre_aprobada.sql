-- =====================================================================
-- 052_tecnico_crear_ot_pre_aprobada.sql  -  El rol Tecnico tambien puede crear
-- Ordenes de Trabajo del flujo Pre, pero SOLO a partir de una cotizacion que
-- ya esta "aprobada" -- en cuanto el administrativo la aprueba, la orden queda
-- "liberada" para que cualquier tecnico la inicie, sin esperar a que alguien
-- administrativo la cree primero.
-- No agrega ningun permiso nuevo: reusa "work-orders.create" (id 81,
-- 051_tecnico_crear_ot_post.sql), la regla nueva la aplica
-- workOrderService.create (si flow_type no es 'post', exige quote_id de una
-- cotizacion con status='aprobada'). Esto solo actualiza el texto de su
-- descripcion para que quede claro en la pantalla de Roles.
-- Ejecutar despues de 051_tecnico_crear_ot_post.sql
-- =====================================================================

UPDATE permissions
SET description = 'Crear ordenes de trabajo (flujo Post, o flujo Pre desde una cotizacion aprobada)'
WHERE code = 'work-orders.create';
