-- =====================================================================
-- 011_work_orders.sql - Modulo Ordenes de Trabajo
-- Basado en el formulario fisico de Taller AEG
-- MySQL 8 / InnoDB / utf8mb4
-- =====================================================================

CREATE TABLE work_orders (
  id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  number          VARCHAR(20)  NOT NULL,                -- No. orden ej. 14252
  client_id       INT UNSIGNED NOT NULL,
  received_at     DATE         NOT NULL,
  delivery_at     DATE         NULL,
  authorized_by   VARCHAR(150) NULL,
  project         VARCHAR(255) NULL,
  status          ENUM('recibido','en_proceso','listo','entregado','cancelado') NOT NULL DEFAULT 'recibido',

  -- Datos del equipo
  equipment_name  VARCHAR(255) NULL,                    -- nombre del equipo
  brand           VARCHAR(120) NULL,
  model           VARCHAR(120) NULL,
  serial          VARCHAR(120) NULL,
  kw              DECIMAL(8,3) NULL,
  voltage         VARCHAR(30)  NULL,                    -- ej. 110/480
  amperage        VARCHAR(30)  NULL,                    -- ej. 3.75/2.15
  rpm             INT          NULL,
  hp              DECIMAL(8,3) NULL,
  frame           VARCHAR(60)  NULL,

  -- Tipo de trabajo
  work_type       VARCHAR(255) NULL,                    -- Rebobinado, Mantenimiento, etc.

  -- Observaciones
  observations    TEXT         NULL,
  internal_notes  TEXT         NULL,

  -- Referencias
  quotation_number VARCHAR(30) NULL,
  dte_number       VARCHAR(50) NULL,
  oc_number        VARCHAR(30) NULL,

  -- Tecnicos
  tech_disarm     VARCHAR(150) NULL,
  tech_assemble   VARCHAR(150) NULL,

  -- Total
  total           DECIMAL(12,2) NULL DEFAULT 0.00,

  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_work_orders_number (number),
  KEY idx_wo_client (client_id),
  KEY idx_wo_status (status),
  CONSTRAINT fk_wo_client FOREIGN KEY (client_id) REFERENCES clients (id)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Items de la orden (piezas/partes del equipo)
CREATE TABLE work_order_items (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  work_order_id INT UNSIGNED NOT NULL,
  name          VARCHAR(255) NOT NULL,
  quantity      INT          NOT NULL DEFAULT 1,
  has_item      TINYINT(1)   NOT NULL DEFAULT 0,   -- SI/NO
  notes         VARCHAR(255) NULL,
  PRIMARY KEY (id),
  KEY idx_woi_order (work_order_id),
  CONSTRAINT fk_woi_order FOREIGN KEY (work_order_id) REFERENCES work_orders (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
