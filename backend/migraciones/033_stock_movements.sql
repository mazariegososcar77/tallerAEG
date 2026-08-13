-- =====================================================================
-- 033_stock_movements.sql  -  Kardex de inventario
-- Introduce el libro de movimientos de existencias (stock_movements), que
-- pasa a ser la UNICA fuente de verdad del stock: a partir de aqui
-- articles.quantity nunca se modifica directo, siempre como consecuencia de
-- un movimiento registrado aqui (regla implementada en src/services/
-- inventoryService.js, el unico modulo autorizado a tocar quantity).
--
-- Tambien agrega articles.cost (costo de compra), que hasta ahora no existia:
-- articles.price es el precio de VENTA y valuar el kardex con el precio de
-- venta daria un costo de trabajo falso. Se deja NULL (costo desconocido)
-- en vez de copiar price, para no inventar datos -- ver 035_..._seed.sql.
--
-- MySQL 8 / InnoDB / utf8mb4. Ejecutar despues de 032_system_settings.sql
-- =====================================================================

-- Costo de compra del articulo. NULL = todavia no se ha capturado (explicito,
-- distinto de un costo real de 0.00). Quien consuma esta columna debe usar
-- COALESCE(cost, 0).
ALTER TABLE articles
  ADD COLUMN cost DECIMAL(12,2) NULL DEFAULT NULL AFTER price;

CREATE TABLE stock_movements (
  id             INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  article_id     INT UNSIGNED  NOT NULL,
  type           ENUM('entrada','salida') NOT NULL,
  -- Siempre positiva: el signo lo da `type`. Guardar cantidades negativas
  -- rompe los SUM() por tipo que usa la reconciliacion del kardex.
  quantity       DECIMAL(12,2) NOT NULL,
  unit_cost      DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  -- Saldo del articulo despues de aplicar este movimiento. Es redundante
  -- contra la suma del historico a proposito: permite auditar "como llego
  -- este articulo a este saldo" y detectar descuadres contra
  -- articles.quantity sin recalcular todo el historial.
  balance_after  DECIMAL(12,2) NOT NULL,
  -- De donde nace el movimiento. 'saldo_inicial' solo lo usa 035 al activar
  -- el kardex; 'compra' queda reservado para un futuro modulo de compras.
  reference_type ENUM('work_report','ajuste','saldo_inicial','compra') NOT NULL,
  reference_id   INT UNSIGNED  NULL,
  -- Quien lo provoco. NULL = generado por el sistema (migracion, proceso
  -- automatico), no por una persona.
  user_id        INT UNSIGNED  NULL,
  notes          VARCHAR(255)  NULL,
  created_at     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  -- Indice clave: sobre el se calcula el consumo neto ya registrado de una
  -- referencia (ej. un reporte de trabajo), que es lo que hace idempotente
  -- el descuento de inventario.
  KEY idx_sm_reference (reference_type, reference_id),
  KEY idx_sm_article (article_id, created_at),
  CONSTRAINT fk_sm_article FOREIGN KEY (article_id) REFERENCES articles (id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_sm_user FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
