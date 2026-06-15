-- =====================================================================
-- 012_machines_maintenance.sql
-- Modulo: Catalogo de Maquinas + Calendario de Mantenimientos
-- MySQL 8 / InnoDB / utf8mb4
-- =====================================================================

CREATE TABLE machines (
  id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  client_id       INT UNSIGNED NOT NULL,
  name            VARCHAR(255) NOT NULL,
  brand           VARCHAR(120) NULL,
  model           VARCHAR(120) NULL,
  serial          VARCHAR(120) NULL,
  kw              DECIMAL(8,3) NULL,
  voltage         VARCHAR(30)  NULL,
  amperage        VARCHAR(30)  NULL,
  rpm             INT          NULL,
  hp              DECIMAL(8,3) NULL,
  location        VARCHAR(255) NULL,
  notes           TEXT         NULL,
  is_active       TINYINT(1)   NOT NULL DEFAULT 1,
  created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_machines_client (client_id),
  CONSTRAINT fk_machines_client FOREIGN KEY (client_id) REFERENCES clients (id)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE maintenance_schedules (
  id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  machine_id      INT UNSIGNED NOT NULL,
  client_id       INT UNSIGNED NOT NULL,
  frequency       ENUM('mensual','trimestral','semestral','anual','personalizado') NOT NULL DEFAULT 'semestral',
  frequency_days  INT          NULL,
  last_service    DATE         NULL,
  next_service    DATE         NULL,
  description     TEXT         NULL,
  status          ENUM('al_dia','proximo','vencido') NOT NULL DEFAULT 'al_dia',
  is_active       TINYINT(1)   NOT NULL DEFAULT 1,
  created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_ms_machine (machine_id),
  KEY idx_ms_client (client_id),
  KEY idx_ms_next (next_service),
  CONSTRAINT fk_ms_machine FOREIGN KEY (machine_id) REFERENCES machines (id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_ms_client FOREIGN KEY (client_id) REFERENCES clients (id)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
