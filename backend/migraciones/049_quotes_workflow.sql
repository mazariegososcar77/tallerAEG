-- =====================================================================
-- 049_quotes_workflow.sql  -  Flujo de estados de Cotizacion por clic + vencimiento automatico
-- Antes el estado de una cotizacion se cambiaba a mano desde un selector dentro de la
-- cotizacion (cualquier salto, en cualquier direccion, sin control). Ahora:
--   * El avance (Borrador -> Enviada -> Aprobada/Rechazada) se hace con clics en la
--     tarjeta de la lista, en un solo sentido (lo valida quoteService.updateStatus).
--   * "Vencida" deja de ser una eleccion manual: el sistema la pone sola cuando se pasa
--     la fecha de "Valida hasta" sin que nadie haya aprobado ni rechazado
--     (notificationScheduler, cada ~10 min -- ver quoteService.expireOverdue).
--   * Regresar una cotizacion ya avanzada de vuelta a Borrador (el "deshacer todo") queda
--     detras de un permiso nuevo, pensado para un solo rol (Administrador).
--
-- duplicated_from_id: cuando una cotizacion Vencida se "Duplica" (boton nuevo, crea una
-- cotizacion igual en Borrador con el siguiente numero, para no reabrir precios/condiciones
-- viejas), esta columna amarra la copia con el original -- el Mapa de Relaciones de
-- cualquiera de las dos muestra la otra.
--
-- Continua la numeracion de permisos de 047_invoice_fel.sql (ultimo id: 75).
-- Ejecutar despues de 048_invoice_lines.sql
-- =====================================================================

ALTER TABLE quotes
  ADD COLUMN duplicated_from_id INT UNSIGNED NULL AFTER status,
  ADD CONSTRAINT fk_quotes_duplicated_from FOREIGN KEY (duplicated_from_id) REFERENCES quotes (id)
    ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO permissions (id, code, description, module) VALUES
  (76, 'quotes.reset-status', 'Reiniciar una cotizacion a Borrador', 'Cotizaciones');

-- Administrador (rol 1) unicamente -- mismo criterio que work-reports.force-edit (021) y
-- billing.cancel (047): un permiso "de escape", no para el uso diario.
INSERT INTO role_permissions (role_id, permission_id) VALUES (1, 76);
