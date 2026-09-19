-- =====================================================================
-- 047_invoice_fel.sql  -  Facturacion electronica (FEL) con Digifact
-- Guarda lo que hace falta para facturar y anular de verdad ante la SAT:
--   * fel_issued_at: la fecha/hora de emision EXACTA que se mando en el documento. La
--     anulacion tiene que citarla igual, y el sistema no la puede reconstruir despues.
--   * fel_environment: 'test' o 'prod'. Una factura certificada en el sandbox de Digifact NO
--     es valida ante la SAT; queda marcada para poder avisarlo en la pantalla y el PDF.
--   * Datos de la anulacion (fecha, motivo, UUID del documento de anulacion).
--   * invoice_fel_documents: el XML certificado (el documento legal) y el PDF oficial de
--     Digifact. Van en una tabla aparte para que las consultas de la lista de facturas no
--     arrastren archivos.
--
-- Permiso nuevo billing.cancel (anular una factura certificada): solo Administrador.
-- Continua la numeracion de permisos de 046_equipment_types.sql (ultimo id: 74).
-- Ejecutar despues de 046_equipment_types.sql
-- =====================================================================

ALTER TABLE invoices
  ADD COLUMN fel_issued_at    VARCHAR(30)  NULL AFTER fel_certified_at,
  ADD COLUMN fel_environment  VARCHAR(10)  NULL AFTER fel_issued_at,
  ADD COLUMN cancelled_at     DATETIME     NULL AFTER fel_environment,
  ADD COLUMN cancel_reason    VARCHAR(255) NULL AFTER cancelled_at,
  ADD COLUMN fel_cancel_uuid  VARCHAR(64)  NULL AFTER cancel_reason;

CREATE TABLE invoice_fel_documents (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  invoice_id  INT UNSIGNED NOT NULL,
  kind        ENUM('certificacion','anulacion') NOT NULL DEFAULT 'certificacion',
  xml         MEDIUMTEXT   NULL,
  pdf         MEDIUMBLOB   NULL,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_ifd_invoice_kind (invoice_id, kind),
  CONSTRAINT fk_ifd_invoice FOREIGN KEY (invoice_id) REFERENCES invoices (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO permissions (id, code, description, module) VALUES
  (75, 'billing.cancel', 'Anular facturas certificadas', 'Facturacion');

-- Administrador (rol 1)
INSERT INTO role_permissions (role_id, permission_id) VALUES (1, 75);
