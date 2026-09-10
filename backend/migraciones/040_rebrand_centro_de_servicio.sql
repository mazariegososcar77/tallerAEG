-- =====================================================================
-- 040_rebrand_centro_de_servicio.sql  -  Renombra la marca en los datos ya sembrados
-- El sistema paso de llamarse "Taller AEG" a "Centro de Servicio AEG". El
-- codigo (frontend y backend/src/services/settingsService.js) ya usa el
-- nombre nuevo como valor por defecto, pero `system_settings` es una tabla
-- clave/valor que 032_system_settings.sql ya sembro con los textos viejos
-- ('TALLER AEG' / 'Taller de Embobinado Industrial') en cada base que corrio
-- esa migracion -- y un valor por defecto de codigo no pisa una fila que ya
-- existe en la tabla. Sin este UPDATE, los PDF y la pantalla de Configuracion
-- general seguirian imprimiendo el nombre viejo.
--
-- Solo actualiza si el valor sigue siendo el de fabrica (no toca lo que un
-- administrador ya haya editado a mano desde Configuracion general).
--
-- MySQL 8 / InnoDB / utf8mb4. Ejecutar despues de 039_notifications_log.sql
-- =====================================================================

UPDATE system_settings
   SET setting_value = 'CENTRO DE SERVICIO AEG'
 WHERE setting_key = 'company_name'
   AND setting_value = 'TALLER AEG';

UPDATE system_settings
   SET setting_value = 'Centro de Servicios Industriales'
 WHERE setting_key = 'company_tagline'
   AND setting_value = 'Taller de Embobinado Industrial';
