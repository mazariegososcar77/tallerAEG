-- =====================================================================
-- 045_service_orders_talonario.sql  -  Orden de Servicio = mismo formulario que la
-- Orden de Trabajo (el talonario fisico A.E.G.)
-- La Orden de Servicio deja de mostrar el formato de visita de campo y pasa a
-- capturar exactamente los mismos campos que la Orden de Trabajo (ver
-- 029_work_orders_paper_form.sql y 044_work_orders_talonario.sql). Se agregan aqui
-- las columnas que le faltaban; las de la visita de campo (mediciones electricas,
-- condiciones del pozo, etc.) NO se borran: los datos ya guardados se conservan.
-- Los grupos de casillas y tablas viven en JSON, igual que en work_orders.
-- Se agrega service_order_items (los componentes recibidos), calcada de
-- work_order_items.
-- Ejecutar despues de 044_work_orders_talonario.sql
-- =====================================================================

ALTER TABLE service_orders
  ADD COLUMN code                      VARCHAR(60)   NULL AFTER number,
  ADD COLUMN received_at               DATE          NULL,
  ADD COLUMN delivery_at               DATE          NULL,
  ADD COLUMN next_service_at           DATE          NULL,
  ADD COLUMN authorized_by             VARCHAR(150)  NULL,
  ADD COLUMN project                   VARCHAR(255)  NULL,
  ADD COLUMN work_type                 VARCHAR(255)  NULL,
  ADD COLUMN work_types                JSON          NULL,
  ADD COLUMN equipment_type            JSON          NULL,
  ADD COLUMN kw                        DECIMAL(8,3)  NULL,
  ADD COLUMN voltage                   VARCHAR(30)   NULL,
  ADD COLUMN amperage                  VARCHAR(30)   NULL,
  ADD COLUMN rpm                       INT           NULL,
  ADD COLUMN hp                        DECIMAL(8,3)  NULL,
  ADD COLUMN frame                     VARCHAR(60)   NULL,
  ADD COLUMN pump_brand                VARCHAR(120)  NULL,
  ADD COLUMN pump_impeller             VARCHAR(60)   NULL,
  ADD COLUMN pump_bm                   VARCHAR(60)   NULL,
  ADD COLUMN pump_seal_size            VARCHAR(60)   NULL,
  ADD COLUMN pump_seal_type            ENUM('viton','nitrilo','conico') NULL,
  ADD COLUMN physical_parts            JSON          NULL,
  ADD COLUMN retainers_count           VARCHAR(30)   NULL,
  ADD COLUMN shaft_rectify_mm          VARCHAR(30)   NULL,
  ADD COLUMN bearings_count            VARCHAR(30)   NULL,
  ADD COLUMN bearings_mm               VARCHAR(30)   NULL,
  ADD COLUMN bearings_mm_2             VARCHAR(30)   NULL,
  ADD COLUMN seal_liner_mm             VARCHAR(30)   NULL,
  ADD COLUMN front_cover_mm            VARCHAR(30)   NULL,
  ADD COLUMN rear_cover_mm             VARCHAR(30)   NULL,
  ADD COLUMN fan_hole_mm               VARCHAR(30)   NULL,
  ADD COLUMN lathe_kw                  VARCHAR(30)   NULL,
  ADD COLUMN lathe_hp                  VARCHAR(30)   NULL,
  ADD COLUMN lathe_note                VARCHAR(255)  NULL,
  ADD COLUMN physical_other            VARCHAR(255)  NULL,
  ADD COLUMN screws                    JSON          NULL,
  ADD COLUMN measurement_intake        JSON          NULL,
  ADD COLUMN measurement_delivery      JSON          NULL,
  ADD COLUMN observations              TEXT          NULL,
  ADD COLUMN internal_notes            TEXT          NULL,
  ADD COLUMN quotation_number          VARCHAR(30)   NULL,
  ADD COLUMN dte_number                VARCHAR(50)   NULL,
  ADD COLUMN oc_number                 VARCHAR(30)   NULL,
  ADD COLUMN tech_disarm               VARCHAR(150)  NULL,
  ADD COLUMN tech_assemble             VARCHAR(150)  NULL,
  ADD COLUMN supervisor_aeg_receive    VARCHAR(150)  NULL,
  ADD COLUMN supervisor_aeg_deliver    VARCHAR(150)  NULL,
  ADD COLUMN supervisor_client_deliver VARCHAR(150)  NULL,
  ADD COLUMN supervisor_client_receive VARCHAR(150)  NULL,
  ADD COLUMN shipping                  VARCHAR(150)  NULL,
  ADD COLUMN whatsapp_number           VARCHAR(30)   NULL,
  ADD COLUMN total                     DECIMAL(12,2) NULL DEFAULT 0.00,
  ADD COLUMN torno_price               DECIMAL(10,2) NULL,
  ADD COLUMN parts_price               DECIMAL(10,2) NULL,
  ADD COLUMN labor_article_id          INT UNSIGNED  NULL,
  ADD COLUMN labor_price               DECIMAL(10,2) NULL;

-- Las ordenes que ya existian: la "fecha de ingreso" del talonario es su fecha de visita.
UPDATE service_orders SET received_at = visit_date WHERE received_at IS NULL;

CREATE TABLE IF NOT EXISTS service_order_items (
  id               INT UNSIGNED NOT NULL AUTO_INCREMENT,
  service_order_id INT UNSIGNED NOT NULL,
  name             VARCHAR(255) NOT NULL,
  quantity         INT          NOT NULL DEFAULT 1,
  has_item         TINYINT(1)   NOT NULL DEFAULT 0,
  notes            VARCHAR(255) NULL,
  PRIMARY KEY (id),
  KEY idx_soi_order (service_order_id),
  CONSTRAINT fk_soi_order FOREIGN KEY (service_order_id) REFERENCES service_orders (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
