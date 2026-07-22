-- =====================================================================
-- combinado_015_a_020.sql
-- Bundle de conveniencia: junta 015_quotes.sql .. 020_reports_billing_seed.sql
-- en un solo archivo para importarlo de una vez (phpMyAdmin, MySQL Workbench,
-- HeidiSQL, `mysql ... < archivo`, etc.).
--
-- Los archivos numerados (015..020) siguen siendo la fuente de verdad para
-- futuras migraciones nuevas -- este combinado es solo para aplicar de un
-- jalon los cambios de Cotizaciones (catch-up), Ordenes<-Cotizacion,
-- Reportes de Trabajo y Facturacion.
--
-- REQUISITO: la base ya debe tener aplicadas 001_init.sql .. 014_clients_validation.sql
-- (o al menos las tablas roles/permissions/role_permissions/clients/work_orders
-- y el permiso con id 36 como el mas alto usado).
--
-- Uso:
--   mysql -u <usuario> -p <basededatos> < combinado_015_a_020.sql
-- =====================================================================


-- ── 015_quotes.sql ────────────────────────────────────────────────────
-- Las tablas quotes/quote_items ya se usaban desde el codigo
-- (quoteRepository.js/quoteService.js) sin tener una migracion que las
-- creara. Este script cierra ese vacio; usa IF NOT EXISTS para poder
-- correr sin romper instalaciones donde ya existan a mano.

CREATE TABLE IF NOT EXISTS quotes (
  id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  number          VARCHAR(20)  NOT NULL,
  client_id       INT UNSIGNED NOT NULL,
  date            DATE         NOT NULL,
  valid_until     DATE         NULL,
  status          ENUM('borrador','enviada','aprobada','rechazada','vencida') NOT NULL DEFAULT 'borrador',
  work_type       VARCHAR(255) NULL,
  observations    TEXT         NULL,
  equipment_data  JSON         NULL,      -- [{name,brand,model,serial}, ...] por equipo
  discount        DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  subtotal        DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  total           DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_quotes_number (number),
  KEY idx_quotes_client (client_id),
  KEY idx_quotes_status (status),
  CONSTRAINT fk_quotes_client FOREIGN KEY (client_id) REFERENCES clients (id)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Lineas de mano de obra / repuestos por equipo (equipment_index referencia
-- la posicion dentro de equipment_data).
CREATE TABLE IF NOT EXISTS quote_items (
  id               INT UNSIGNED NOT NULL AUTO_INCREMENT,
  quote_id         INT UNSIGNED NOT NULL,
  equipment_index  INT UNSIGNED NOT NULL DEFAULT 0,
  item_type        ENUM('labor','part') NOT NULL DEFAULT 'labor',
  description      VARCHAR(255) NOT NULL,
  quantity         DECIMAL(10,2) NOT NULL DEFAULT 1,
  unit_price       DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  subtotal         DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  PRIMARY KEY (id),
  KEY idx_qi_quote (quote_id),
  CONSTRAINT fk_quote_items_quote FOREIGN KEY (quote_id) REFERENCES quotes (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ── 016_part_categories.sql ──────────────────────────────────────────
-- Igual que 015: la tabla ya se usaba desde partCategoryRepository.js
-- sin migracion. IF NOT EXISTS para no romper instalaciones donde ya
-- exista a mano.

CREATE TABLE IF NOT EXISTS part_categories (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name        VARCHAR(150) NOT NULL,
  prefix      VARCHAR(10)  NOT NULL,
  is_active   TINYINT(1)   NOT NULL DEFAULT 1,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_part_categories_name (name),
  UNIQUE KEY uq_part_categories_prefix (prefix)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ── 017_work_orders_quote_link.sql ───────────────────────────────────
-- Vincula orden de trabajo <- cotizacion. Permite crear una orden a
-- partir de una cotizacion aprobada, guardando la trazabilidad real (no
-- solo copiar datos). Si la cotizacion se borra, la orden ya creada se
-- conserva (quote_id queda NULL).

ALTER TABLE work_orders
  ADD COLUMN quote_id INT UNSIGNED NULL AFTER id,
  ADD KEY idx_wo_quote (quote_id),
  ADD CONSTRAINT fk_wo_quote FOREIGN KEY (quote_id) REFERENCES quotes (id)
    ON DELETE SET NULL ON UPDATE CASCADE;


-- ── 018_work_reports.sql ─────────────────────────────────────────────
-- Modulo de Reportes de Trabajo. Documenta fotograficamente el proceso
-- de reparacion en 4 etapas fijas: antes de desarmar, desarmado + piezas
-- nuevas, piezas instaladas + usadas, armado final. Un reporte por orden
-- de trabajo.

CREATE TABLE work_reports (
  id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  work_order_id   INT UNSIGNED NOT NULL,
  number          VARCHAR(20)  NOT NULL,
  status          ENUM('en_progreso','finalizado') NOT NULL DEFAULT 'en_progreso',
  general_notes   TEXT         NULL,
  stage_notes     JSON         NULL,     -- {antes,desarmado,piezas_nuevas,armado_final: string}
  finalized_at    DATETIME     NULL,
  created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_work_reports_number (number),
  UNIQUE KEY uq_work_reports_order (work_order_id),
  CONSTRAINT fk_wr_order FOREIGN KEY (work_order_id) REFERENCES work_orders (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE work_report_photos (
  id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  work_report_id  INT UNSIGNED NOT NULL,
  stage           ENUM('antes','desarmado','piezas_nuevas','armado_final') NOT NULL,
  photo_url       VARCHAR(500) NOT NULL,
  caption         VARCHAR(255) NULL,
  sort_order      INT UNSIGNED NOT NULL DEFAULT 0,
  created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_wrp_report_stage (work_report_id, stage),
  CONSTRAINT fk_wrp_report FOREIGN KEY (work_report_id) REFERENCES work_reports (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ── 019_invoices.sql ─────────────────────────────────────────────────
-- Modulo de Facturacion. Una factura por orden de trabajo, generada al
-- finalizar su reporte. Los campos fel_* quedan NULL hasta integrar un
-- certificador FEL real (ver backend/src/services/felCertifier.js) --
-- no se debe simular un UUID/serie FEL falso mientras no exista esa
-- integracion.

CREATE TABLE invoices (
  id                INT UNSIGNED NOT NULL AUTO_INCREMENT,
  number            VARCHAR(20)  NOT NULL,
  work_order_id     INT UNSIGNED NOT NULL,
  work_report_id    INT UNSIGNED NULL,
  quote_id          INT UNSIGNED NULL,
  client_id         INT UNSIGNED NOT NULL,
  date              DATE         NOT NULL,
  subtotal          DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  discount          DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  total             DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  status            ENUM('pendiente_certificacion','certificada','anulada') NOT NULL DEFAULT 'pendiente_certificacion',
  client_email      VARCHAR(150) NULL,
  email_sent_at     DATETIME     NULL,
  fel_certifier     VARCHAR(60)  NULL,
  fel_uuid          VARCHAR(64)  NULL,
  fel_series        VARCHAR(20)  NULL,
  fel_number        VARCHAR(20)  NULL,
  fel_certified_at  DATETIME     NULL,
  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_invoices_number (number),
  UNIQUE KEY uq_invoices_order (work_order_id),
  KEY idx_invoices_client (client_id),
  KEY idx_invoices_status (status),
  KEY idx_invoices_date (date),
  CONSTRAINT fk_invoices_order FOREIGN KEY (work_order_id) REFERENCES work_orders (id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_invoices_report FOREIGN KEY (work_report_id) REFERENCES work_reports (id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_invoices_quote FOREIGN KEY (quote_id) REFERENCES quotes (id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_invoices_client FOREIGN KEY (client_id) REFERENCES clients (id)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE invoice_items (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  invoice_id    INT UNSIGNED NOT NULL,
  description   VARCHAR(255) NOT NULL,
  quantity      DECIMAL(10,2) NOT NULL DEFAULT 1,
  unit_price    DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  subtotal      DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  PRIMARY KEY (id),
  KEY idx_ii_invoice (invoice_id),
  CONSTRAINT fk_invoice_items_invoice FOREIGN KEY (invoice_id) REFERENCES invoices (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ── 020_reports_billing_seed.sql ─────────────────────────────────────
-- Permisos de Reportes de Trabajo y Facturacion. Continua la numeracion
-- de 014_clients_validation.sql (ultimo id: 36).

INSERT INTO permissions (id, code, description, module) VALUES
  (37, 'work-reports.view',   'Ver reportes de trabajo',      'Reportes'),
  (38, 'work-reports.create', 'Crear reportes de trabajo',    'Reportes'),
  (39, 'work-reports.update', 'Editar reportes de trabajo',   'Reportes'),
  (40, 'work-reports.delete', 'Eliminar reportes de trabajo', 'Reportes'),
  (41, 'billing.view',        'Ver facturas',                 'Facturacion'),
  (42, 'billing.create',      'Generar facturas',             'Facturacion'),
  (43, 'billing.certify',     'Certificar facturas',          'Facturacion');

-- Administrador (rol 1): todos los permisos nuevos
INSERT INTO role_permissions (role_id, permission_id) VALUES
  (1,37),(1,38),(1,39),(1,40),(1,41),(1,42),(1,43);
-- Operador (rol 2): reportes sin borrar, facturacion sin certificar
-- (certificar es una accion fiscal sensible, reservada a Administrador).
INSERT INTO role_permissions (role_id, permission_id) VALUES
  (2,37),(2,38),(2,39),(2,41),(2,42);
-- Consulta (rol 3): solo ver
INSERT INTO role_permissions (role_id, permission_id) VALUES
  (3,37),(3,41);
