-- =====================================================================
-- 039_notifications_log.sql  -  Registro de avisos automaticos enviados
-- Tabla de deduplicacion para las notificaciones automaticas (stock bajo,
-- facturas sin certificar, etc.) que va a generar n8n consultando esta base
-- por Cron. El backend NO escribe ni lee esta tabla todavia -- la usa n8n
-- directamente: antes de mandar un aviso pregunta aqui si ya lo mando en las
-- ultimas N horas (con el indice de abajo), y despues de mandarlo inserta la
-- linea. Sin esto, cada corrida del Cron reenviaria el mismo aviso.
--
-- MySQL 8 / InnoDB / utf8mb4. Ejecutar despues de 038_articles_min_stock.sql
-- =====================================================================

CREATE TABLE notifications_log (
  id             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  -- Tipo de aviso. VARCHAR abierto a proposito (no ENUM): sumar un tipo de
  -- notificacion nuevo en n8n no deberia depender de una migracion. Los que
  -- ya se tienen pensados: 'low_stock', 'negative_stock',
  -- 'invoice_uncertified', 'report_stalled', 'quote_expiring'.
  type           VARCHAR(60)  NOT NULL,
  -- A que registro del sistema se refiere el aviso (ej. 'article', 'invoice').
  reference_type VARCHAR(60)  NOT NULL,
  reference_id   INT UNSIGNED NOT NULL,
  -- Por donde se mando (ej. 'email'). Tambien abierto: manana puede sumarse
  -- 'whatsapp' sin tocar el esquema.
  channel        VARCHAR(30)  NOT NULL,
  -- Datos libres del aviso (ej. el nivel de stock en ese momento, el monto de
  -- la factura), para poder revisar despues que se mando exactamente sin
  -- tener que reconstruirlo desde las tablas originales.
  meta           JSON         NULL,
  sent_at        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  -- Pensado para la pregunta que hace n8n antes de mandar cada aviso: "¿ya
  -- avise de este type+reference en las ultimas N horas?".
  KEY idx_notifications_log_dedup (type, reference_type, reference_id, sent_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
