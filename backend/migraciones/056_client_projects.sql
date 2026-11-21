-- =====================================================================
-- 056_client_projects.sql  -  Sub-proyectos por cliente
-- Un mismo cliente (un NIT/razon social, ej. "RETRILLA Y BENEFICIO DE
-- CAFES...") puede tener varios proyectos/sucursales (ej. "Burger King
-- Amatitlan", "Burger King Zona 10"): no se puede crear un cliente nuevo
-- por cada uno (el NIT es unico), asi que el proyecto se etiqueta dentro
-- del mismo cliente. Es solo un nombre + ubicacion para clasificar
-- maquinas/ordenes/cotizaciones, no un cliente de facturacion aparte: la
-- factura siempre sale a nombre del cliente (mismo NIT).
-- MySQL 8 / InnoDB / utf8mb4. Ejecutar despues de 055_tecnico_quitar_create_update_clientes.sql
-- =====================================================================

CREATE TABLE client_projects (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  client_id   INT UNSIGNED NOT NULL,
  name        VARCHAR(255) NOT NULL,
  location    VARCHAR(255) NULL,
  is_active   TINYINT(1)   NOT NULL DEFAULT 1,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_client_projects_name (client_id, name),
  KEY idx_client_projects_client (client_id),
  CONSTRAINT fk_client_projects_client FOREIGN KEY (client_id) REFERENCES clients (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- project_id es NULL-able a proposito, mismo criterio que machine_id en
-- 031_client_equipment_history.sql: los registros existentes quedan sin
-- etiquetar y el formulario sigue funcionando igual si no se elige ninguno.
-- ON DELETE SET NULL: borrar/desactivar un sub-proyecto nunca debe borrar
-- maquinas, ordenes o cotizaciones ya guardadas con esa etiqueta.
ALTER TABLE machines
  ADD COLUMN project_id INT UNSIGNED NULL AFTER client_id,
  ADD CONSTRAINT fk_machines_project FOREIGN KEY (project_id) REFERENCES client_projects (id) ON DELETE SET NULL;

ALTER TABLE work_orders
  ADD COLUMN project_id INT UNSIGNED NULL AFTER machine_id,
  ADD CONSTRAINT fk_wo_project FOREIGN KEY (project_id) REFERENCES client_projects (id) ON DELETE SET NULL;

ALTER TABLE quotes
  ADD COLUMN project_id INT UNSIGNED NULL AFTER client_id,
  ADD CONSTRAINT fk_quotes_project FOREIGN KEY (project_id) REFERENCES client_projects (id) ON DELETE SET NULL;
