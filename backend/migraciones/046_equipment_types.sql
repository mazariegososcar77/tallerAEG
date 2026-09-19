-- =====================================================================
-- 046_equipment_types.sql  -  Catalogo configurable de Tipos de Equipo (con categoria)
-- Las casillas "Tipo de equipo" de la Orden de Trabajo y de Servicio (Motor trifasico,
-- Bomba sumergible, Blower...) estaban fijas en el codigo. Este script las convierte en
-- un catalogo administrable desde Configuracion, y cada tipo pertenece a una CATEGORIA
-- (Motores, Bombas, Otros...) con la que se agrupan en el formulario.
--
-- `code` es lo que se guarda dentro de work_orders.equipment_type / service_orders.
-- equipment_type (JSON, campo `subtypes`): por eso los 8 tipos de siempre conservan
-- exactamente el mismo codigo y las ordenes ya hechas siguen mostrando sus casillas. El
-- codigo no cambia aunque se renombre el tipo. Borrar un tipo no rompe ordenes viejas:
-- solo se pierde el nombre bonito (se muestra el codigo).
--
-- Continua la numeracion de permisos de 042_document_series.sql (ultimo id: 70).
-- Ejecutar despues de 045_service_orders_talonario.sql
-- =====================================================================

CREATE TABLE equipment_types (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  code       VARCHAR(100) NOT NULL,
  name       VARCHAR(150) NOT NULL,
  category   VARCHAR(100) NOT NULL DEFAULT 'Otros',
  is_active  TINYINT(1)   NOT NULL DEFAULT 1,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_equipment_types_code (code),
  UNIQUE KEY uq_equipment_types_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO equipment_types (code, name, category) VALUES
  ('motor_trifasico',  'Motor trifásico',  'Motores'),
  ('motor_monofasico', 'Motor monofásico', 'Motores'),
  ('motor_ventilador', 'Motor ventilador', 'Motores'),
  ('motor_reductor',   'Motor reductor',   'Motores'),
  ('bomba_sumergible', 'Bomba sumergible', 'Bombas'),
  ('bomba_centrifuga', 'Bomba centrífuga', 'Bombas'),
  ('blower',           'Blower',           'Otros'),
  ('generador',        'Generador',        'Otros');

INSERT INTO permissions (id, code, description, module) VALUES
  (71, 'equipment-types.view',   'Ver tipos de equipo',      'Configuracion'),
  (72, 'equipment-types.create', 'Crear tipos de equipo',    'Configuracion'),
  (73, 'equipment-types.update', 'Editar tipos de equipo',   'Configuracion'),
  (74, 'equipment-types.delete', 'Eliminar tipos de equipo', 'Configuracion');

-- Administrador (rol 1): todos. Operador (2) y Consulta (3): solo ver, porque el
-- formulario de las ordenes lee este catalogo.
INSERT INTO role_permissions (role_id, permission_id) VALUES
  (1,71),(1,72),(1,73),(1,74),
  (2,71),
  (3,71);
