-- =====================================================================
-- 026_service_orders.sql  -  Modulo de Ordenes de Servicio (subcontratos)
-- Trabajos que el taller manda a hacer AFUERA con un subcontratista externo
-- (ej. torneado). Es informacion que NO debe mezclarse con Ordenes de
-- Trabajo (interna) -- el rol "Subcontrato" solo debe poder ver este
-- modulo y Reportes de Trabajo, nada mas del sistema.
--
-- Reportes de Trabajo se generaliza para documentar tambien una Orden de
-- Servicio (mismas 4 etapas/fotos/firmas que ya existen, sin duplicar el
-- modulo): work_order_id pasa a ser opcional y se agrega service_order_id,
-- exactamente uno de los dos debe venir lleno (CHECK).
-- MySQL 8 / InnoDB / utf8mb4. Ejecutar despues de 025_work_orders_flow_pricing.sql
-- =====================================================================

CREATE TABLE IF NOT EXISTS subcontractors (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name         VARCHAR(190) NOT NULL,
  contact_name VARCHAR(150) NULL,
  phone        VARCHAR(30)  NULL,
  email        VARCHAR(150) NULL,
  is_active    TINYINT(1)   NOT NULL DEFAULT 1,
  created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS service_orders (
  id                  INT UNSIGNED NOT NULL AUTO_INCREMENT,
  number              VARCHAR(20)  NOT NULL,
  subcontractor_id    INT UNSIGNED NOT NULL,
  client_id           INT UNSIGNED NULL,       -- opcional: a que cliente/trabajo pertenece
  work_order_id       INT UNSIGNED NULL,       -- opcional: enlace al equipo/orden interna de origen
  equipment_name      VARCHAR(255) NULL,
  brand               VARCHAR(120) NULL,
  model               VARCHAR(120) NULL,
  serial              VARCHAR(120) NULL,
  description         TEXT         NOT NULL,   -- que se manda a hacer afuera
  sent_at             DATE         NOT NULL,
  expected_return_at  DATE         NULL,
  received_at         DATE         NULL,
  status              ENUM('enviada','en_proceso','recibida','cancelada') NOT NULL DEFAULT 'enviada',
  agreed_cost         DECIMAL(12,2) NULL,
  actual_cost         DECIMAL(12,2) NULL,
  notes               TEXT         NULL,
  created_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_service_orders_number (number),
  KEY idx_so_subcontractor (subcontractor_id),
  KEY idx_so_client (client_id),
  KEY idx_so_status (status),
  CONSTRAINT fk_so_subcontractor FOREIGN KEY (subcontractor_id) REFERENCES subcontractors (id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_so_client FOREIGN KEY (client_id) REFERENCES clients (id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_so_work_order FOREIGN KEY (work_order_id) REFERENCES work_orders (id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Nota: MySQL no permite un CHECK sobre una columna que participa en una accion
-- referencial de FK (ON DELETE CASCADE), asi que "exactamente uno de los dos
-- debe venir lleno" queda como regla de aplicacion (workReportService solo crea
-- reportes via createForOrder o createForServiceOrder, nunca ambos a la vez),
-- igual que la regla NIT/DPI de clientes tampoco es un CHECK de base de datos.
ALTER TABLE work_reports
  MODIFY work_order_id INT UNSIGNED NULL,
  ADD COLUMN service_order_id INT UNSIGNED NULL AFTER work_order_id,
  ADD UNIQUE KEY uq_work_reports_service_order (service_order_id),
  ADD CONSTRAINT fk_wr_service_order FOREIGN KEY (service_order_id) REFERENCES service_orders (id)
    ON DELETE CASCADE ON UPDATE CASCADE;

-- Permisos nuevos, ids continuando desde 48 (024_part_categories_management.sql).
INSERT INTO permissions (id, code, description, module) VALUES
  (49, 'service-orders.view',    'Ver ordenes de servicio',      'Ordenes de Servicio'),
  (50, 'service-orders.create',  'Crear ordenes de servicio',    'Ordenes de Servicio'),
  (51, 'service-orders.update',  'Editar ordenes de servicio',   'Ordenes de Servicio'),
  (52, 'service-orders.delete',  'Eliminar ordenes de servicio', 'Ordenes de Servicio'),
  (53, 'subcontractors.view',    'Ver subcontratistas',          'Subcontratistas'),
  (54, 'subcontractors.create',  'Crear subcontratistas',        'Subcontratistas'),
  (55, 'subcontractors.update',  'Editar subcontratistas',       'Subcontratistas'),
  (56, 'subcontractors.delete',  'Eliminar subcontratistas',     'Subcontratistas');

-- Rol 1 (Administrador): todos los permisos nuevos.
INSERT INTO role_permissions (role_id, permission_id) VALUES
  (1,49),(1,50),(1,51),(1,52),(1,53),(1,54),(1,55),(1,56);
-- Rol 2 (Operador): view/create/update, no delete (mismo patron que work-reports/billing).
INSERT INTO role_permissions (role_id, permission_id) VALUES
  (2,49),(2,50),(2,51),(2,53),(2,54),(2,55);
-- Rol 3 (Consulta): solo view.
INSERT INTO role_permissions (role_id, permission_id) VALUES
  (3,49),(3,53);
