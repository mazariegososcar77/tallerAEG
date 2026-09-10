-- =====================================================================
-- 036_work_order_documents.sql  -  Documentos adjuntos de una orden
-- Guarda los archivos de TERCEROS que acompanan a una orden de trabajo:
-- la factura del taller de torneado, el certificado de un bobinado, la
-- cotizacion del proveedor, la foto de una placa que mando el cliente. Son
-- documentos que llegan de afuera y que hoy viven en el correo o en el
-- celular de alguien, no en la orden.
--
-- Se diferencia de work_report_photos en que aquello es la documentacion
-- fotografica que produce el taller en las 4 etapas del trabajo; esto es
-- papeleria de terceros, con su titulo y en cualquier formato (PDF, texto,
-- imagen, Word, Excel).
--
-- Cuelga de work_orders y NO de work_reports a proposito: un documento de
-- un tercero pertenece al trabajo completo, no a una etapa del reporte, y
-- tiene que poder subirse aunque el reporte todavia no exista.
--
-- MySQL 8 / InnoDB / utf8mb4. Ejecutar despues de 035_stock_movements_seed.sql
-- =====================================================================

CREATE TABLE work_order_documents (
  id             INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  work_order_id  INT UNSIGNED  NOT NULL,
  -- Como lo nombra quien lo sube ("Factura torneado El Progreso"). Es lo que
  -- se lee en la lista: el nombre del archivo original casi nunca dice nada
  -- util (scan_0012.pdf), por eso el titulo es obligatorio y aquel solo se
  -- conserva como referencia.
  title          VARCHAR(190)  NOT NULL,
  file_url       VARCHAR(500)  NOT NULL,
  original_name  VARCHAR(255)  NULL,
  mime_type      VARCHAR(120)  NULL,
  size_bytes     INT UNSIGNED  NULL,
  -- Quien lo subio. NULL si ese usuario se elimina despues: se pierde el
  -- quien, pero nunca el documento.
  uploaded_by    INT UNSIGNED  NULL,
  created_at     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_wod_order (work_order_id, created_at),
  CONSTRAINT fk_wod_order FOREIGN KEY (work_order_id) REFERENCES work_orders (id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_wod_user FOREIGN KEY (uploaded_by) REFERENCES users (id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Constancia de que alguien reviso los documentos de esta orden antes de
-- facturarla. Es lo que hace que el paso previo a la facturacion sea un
-- bloqueo real y no solo un aviso en pantalla: el backend exige esta marca
-- antes de generar la factura, en los dos flujos (Pre, al finalizar el
-- reporte; Post, al generar la factura a mano).
--
-- Que quede en NULL significa "todavia nadie lo reviso". Confirmar que NO hay
-- documentos adicionales tambien llena esta columna: es una respuesta valida y
-- lo importante es que quede registrado quien la dio y cuando.
ALTER TABLE work_orders
  ADD COLUMN documents_reviewed_at DATETIME     NULL DEFAULT NULL,
  ADD COLUMN documents_reviewed_by INT UNSIGNED NULL DEFAULT NULL,
  ADD CONSTRAINT fk_wo_docs_reviewer FOREIGN KEY (documents_reviewed_by)
    REFERENCES users (id) ON DELETE SET NULL ON UPDATE CASCADE;

-- Las ordenes que ya existen quedan SIN revisar a proposito: el bloqueo les
-- aplica igual que a las nuevas. Si en algun momento se necesita arrancar con
-- las ordenes ya facturadas dadas por revisadas, es un UPDATE aparte -- no se
-- hace aqui para no dar por revisado lo que nadie reviso.

-- Permisos nuevos: ids continuando desde 61 (035_stock_movements_seed.sql).
INSERT INTO permissions (id, code, description, module) VALUES
  (62, 'work-order-documents.view',   'Ver los documentos adjuntos de una orden',       'Ordenes de Trabajo'),
  (63, 'work-order-documents.manage', 'Subir documentos y confirmar la revision',       'Ordenes de Trabajo'),
  (64, 'work-order-documents.delete', 'Eliminar un documento ya subido',                'Ordenes de Trabajo');

-- Rol 1 (Administrador): todo, incluido borrar.
INSERT INTO role_permissions (role_id, permission_id) VALUES
  (1,62),(1,63),(1,64);
-- Rol 2 (Operador): ve y sube, pero NO borra. Un documento de un tercero es el
-- respaldo de algo que se factura; que desaparezca sin rastro es peor que
-- tener uno de mas, asi que borrar queda solo para Administrador.
INSERT INTO role_permissions (role_id, permission_id) VALUES
  (2,62),(2,63);
-- Rol 3 (Consulta): solo ver.
INSERT INTO role_permissions (role_id, permission_id) VALUES
  (3,62);
