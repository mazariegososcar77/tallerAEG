-- =====================================================================
-- 032_system_settings.sql  -  Configuracion general del sistema
-- La pantalla Configuracion > "Configuracion general" (/configuracion/general)
-- era un placeholder "Proximamente". Este script crea la tabla que la respalda.
--
-- Es una tabla clave/valor a proposito: los ajustes son pocos, sueltos y de
-- tipos distintos (colores, textos, numeros), y asi agregar un ajuste nuevo NO
-- necesita otra migracion -- solo una entrada en DEFAULTS de
-- src/services/settingsService.js (ese archivo es la fuente de verdad de que
-- claves existen, su tipo y su valor por defecto).
--
-- Los valores que se siembran aqui son exactamente los que el sistema ya usaba
-- hardcodeado, para que aplicar esta migracion no cambie nada de como se ve o
-- se imprime hoy.
--
-- Continua la numeracion de permisos de 026_service_orders.sql (ultimo id: 56).
-- Ejecutar despues de 031_client_equipment_history.sql
-- =====================================================================

CREATE TABLE IF NOT EXISTS system_settings (
  setting_key   VARCHAR(64) NOT NULL PRIMARY KEY,
  setting_value TEXT NULL,
  updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Apariencia  
-- INSERT IGNORE: si el script se corre dos veces no falla ni pisa los valores
-- que el taller ya haya configurado desde la pantalla.
INSERT IGNORE INTO system_settings (setting_key, setting_value) VALUES
  ('theme_default',    'light'),    -- light | dark | system (el usuario igual puede cambiarlo)
  ('color_primary',    '#164B2C'),  -- verde oscuro de marca
  ('color_accent',     '#CA8A04');  -- amarillo dorado de marca

-- Datos del taller (se imprimen en el encabezado/pie de todos los PDF)
-- INSERT IGNORE: si el script se corre dos veces no falla ni pisa los valores
-- que el taller ya haya configurado desde la pantalla.
INSERT IGNORE INTO system_settings (setting_key, setting_value) VALUES
  ('company_name',     'TALLER AEG'),
  ('company_tagline',  'Taller de Embobinado Industrial'),
  ('company_address',  'Guatemala, Guatemala'),
  ('company_phone',    '(+502) 0000-0000'),
  ('company_email',    ''),
  ('company_nit',      '');

-- Documentos
-- INSERT IGNORE: si el script se corre dos veces no falla ni pisa los valores
-- que el taller ya haya configurado desde la pantalla.
INSERT IGNORE INTO system_settings (setting_key, setting_value) VALUES
  ('quote_valid_days', '15');       -- vigencia por defecto de una cotizacion

INSERT INTO permissions (id, code, description, module) VALUES
  (57, 'settings.view',   'Ver la configuracion general del sistema',    'Configuracion'),
  (58, 'settings.update', 'Editar la configuracion general del sistema', 'Configuracion');

-- Solo Administrador (rol 1). Es configuracion de todo el sistema: no se le da
-- a Operador ni a Consulta, a diferencia de los catalogos de Configuracion.
-- OJO: GET /api/settings NO exige estos permisos (cualquier sesion puede leer
-- los ajustes, porque el tema y los colores se aplican para todos); el permiso
-- controla ver la pantalla y guardar cambios.
INSERT INTO role_permissions (role_id, permission_id) VALUES
  (1,57),(1,58);
