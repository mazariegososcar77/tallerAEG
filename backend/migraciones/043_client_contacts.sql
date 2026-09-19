-- =====================================================================
-- 043_client_contacts.sql  -  Multiples contactos por cliente
-- El cliente tenia un solo campo `email`. Un cliente real (sobre todo
-- empresa/gobierno) suele tener varias personas de contacto, cada una con
-- su propio correo -- hoy no habia donde guardar eso. Este script:
--   1) crea client_contacts (1 cliente : N contactos, cada uno con su
--      correo y el nombre de la persona dueña de ese correo).
--   2) migra el `email` que ya tenia cada cliente como su primer contacto
--      (usando el nombre del cliente como nombre de contacto, que es lo
--      mas cercano a un dato real disponible para ese campo nuevo).
--   3) quita `clients.email`: de aqui en adelante el correo vive SOLO en
--      client_contacts. No hay "contacto principal" marcado a proposito:
--      las pantallas que antes proponian un correo por defecto (enviar
--      cotizacion, certificar factura) ahora dejan elegir entre los
--      contactos disponibles del cliente.
--
-- OJO con el nombre de columna: a proposito se llama `name`, NO
-- `contact_name` -- clients.contact_name (030_clients_business_fields.sql)
-- ya existe y significa otra cosa (la persona de contacto de una empresa/
-- gobierno, sin correo asociado); usar el mismo nombre aqui hubiera
-- confundido dos conceptos distintos.
--
-- No hace falta un permiso nuevo: los contactos se administran como parte
-- de la ficha del cliente, bajo los mismos permisos `clients.create`/
-- `clients.update` de siempre.
--
-- Ejecutar despues de 042_document_series.sql
-- =====================================================================

CREATE TABLE client_contacts (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  client_id  INT UNSIGNED NOT NULL,
  email      VARCHAR(190) NOT NULL,
  name       VARCHAR(150) NOT NULL DEFAULT '',
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_client_contacts_client (client_id),
  CONSTRAINT fk_client_contacts_client FOREIGN KEY (client_id)
    REFERENCES clients (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO client_contacts (client_id, email, name)
SELECT id, email,
  CASE WHEN last_name IS NOT NULL AND last_name != '' THEN CONCAT(first_name, ' ', last_name) ELSE first_name END
FROM clients
WHERE email IS NOT NULL AND email != '';

ALTER TABLE clients DROP COLUMN email;
