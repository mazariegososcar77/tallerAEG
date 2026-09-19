-- =====================================================================
-- 042_document_series.sql  -  Numeracion de documentos configurable
-- Los 5 documentos con numero correlativo (quotes, work_orders,
-- service_orders, invoices, work_reports) calculaban su numero cada uno
-- por su cuenta, igual: `MAX(CAST(number AS UNSIGNED)) + 1`, sin prefijo,
-- sin forma de editarlo a mano, y sin ser atomico (dos personas guardando
-- al mismo tiempo podian terminar con el mismo numero -- el MAX se leia en
-- una consulta separada del INSERT que lo usaba).
--
-- Esta tabla centraliza esas 5 series en un catalogo unico, administrable
-- desde Configuracion: prefijo, cantidad de digitos (relleno con ceros) y
-- el siguiente numero, editable a mano por un Administrador -- entre otras
-- cosas, es lo que resuelve poder "asignar manualmente el numero" en un
-- ambiente de desarrollo. `document_type` es la llave primaria a proposito
-- (una fila fija por cada uno de los 5 tipos que ya existen; no hay alta ni
-- baja de series nuevas desde la pantalla, src/services/numberingService.js
-- es la fuente de verdad de que tipos existen, igual que SETTINGS_SCHEMA lo
-- es para system_settings).
--
-- El numero inicial de cada serie continua desde el maximo ya usado en su
-- tabla (COALESCE(MAX(...), 0) + 1), para que aplicar esta migracion no
-- vuelva a repetir un numero ya emitido.
--
-- Continua la numeracion de permisos de 041_work_types.sql (ultimo id: 68).
-- Ejecutar despues de 041_work_types.sql
-- =====================================================================

CREATE TABLE document_series (
  document_type VARCHAR(30)      NOT NULL,
  label         VARCHAR(100)     NOT NULL,
  prefix        VARCHAR(20)      NOT NULL DEFAULT '',
  digits        TINYINT UNSIGNED NOT NULL DEFAULT 4,
  next_number   INT UNSIGNED     NOT NULL DEFAULT 1,
  updated_at    TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (document_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO document_series (document_type, label, next_number)
SELECT 'quote', 'Cotizaciones', COALESCE(MAX(CAST(number AS UNSIGNED)), 0) + 1 FROM quotes;

INSERT INTO document_series (document_type, label, next_number)
SELECT 'work_order', 'Ordenes de Trabajo', COALESCE(MAX(CAST(number AS UNSIGNED)), 0) + 1 FROM work_orders;

INSERT INTO document_series (document_type, label, next_number)
SELECT 'service_order', 'Ordenes de Servicio', COALESCE(MAX(CAST(number AS UNSIGNED)), 0) + 1 FROM service_orders;

INSERT INTO document_series (document_type, label, next_number)
SELECT 'invoice', 'Facturas', COALESCE(MAX(CAST(number AS UNSIGNED)), 0) + 1 FROM invoices;

INSERT INTO document_series (document_type, label, next_number)
SELECT 'work_report', 'Reportes de Trabajo', COALESCE(MAX(CAST(number AS UNSIGNED)), 0) + 1 FROM work_reports;

INSERT INTO permissions (id, code, description, module) VALUES
  (69, 'document-series.view',   'Ver la numeracion de documentos',    'Configuracion'),
  (70, 'document-series.update', 'Editar la numeracion de documentos', 'Configuracion');

-- Solo Administrador (rol 1): igual que Configuracion general (settings.*),
-- es un ajuste de todo el sistema, no un catalogo operativo del dia a dia.
INSERT INTO role_permissions (role_id, permission_id) VALUES
  (1,69),(1,70);
