-- =====================================================================
-- 041_work_types.sql  -  Catalogo configurable de Tipos de Trabajo
-- "Tipo de trabajo" (Rebobinado, Mantenimiento, Reparacion, Cambio de
-- conexion, Calculo de voltaje, Otros) estaba fijo/hardcodeado en el
-- frontend (WORK_TYPES en QuoteFormPage.jsx y WorkOrderFormPage.jsx). Este
-- script lo convierte en un catalogo real, administrable desde
-- Configuracion, igual que article_types/part_categories/client_types.
--
-- A proposito NO se toca quotes.work_type ni work_orders.work_type (siguen
-- siendo texto libre, no una FK a este catalogo): ese campo ya guarda lo
-- que el usuario elige tal cual, y cambiar eso a una relacion es una
-- migracion de datos aparte, mas riesgosa, que no pidieron. Este catalogo
-- solo reemplaza de donde sale la lista de opciones del selector.
--
-- Continua la numeracion de permisos de 036_work_order_documents.sql
-- (ultimo id: 64).
-- Ejecutar despues de 040_rebrand_centro_de_servicio.sql
-- =====================================================================

CREATE TABLE work_types (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name        VARCHAR(150) NOT NULL,
  description VARCHAR(255) NOT NULL DEFAULT '',
  is_active   TINYINT(1)   NOT NULL DEFAULT 1,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_work_types_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Mismos valores que ya usaba el selector fijo, para que aplicar esta
-- migracion no cambie las opciones disponibles hasta que alguien las edite
-- a proposito desde Configuracion.
INSERT INTO work_types (name) VALUES
  ('Rebobinado'),
  ('Mantenimiento'),
  ('Reparacion'),
  ('Cambio de conexion'),
  ('Calculo de voltaje'),
  ('Otros');

INSERT INTO permissions (id, code, description, module) VALUES
  (65, 'work-types.view',   'Ver tipos de trabajo',      'Configuracion'),
  (66, 'work-types.create', 'Crear tipos de trabajo',    'Configuracion'),
  (67, 'work-types.update', 'Editar tipos de trabajo',   'Configuracion'),
  (68, 'work-types.delete', 'Eliminar tipos de trabajo', 'Configuracion');

-- Administrador (rol 1): todos los permisos nuevos
INSERT INTO role_permissions (role_id, permission_id) VALUES
  (1,65),(1,66),(1,67),(1,68);
-- Operador (rol 2) y Consulta (rol 3): solo ver, igual que el resto de
-- catalogos de Configuracion (article-types, warehouses, part-categories).
INSERT INTO role_permissions (role_id, permission_id) VALUES
  (2,65),
  (3,65);
