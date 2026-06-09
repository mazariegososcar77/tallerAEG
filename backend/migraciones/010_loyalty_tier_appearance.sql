-- =====================================================================
-- 010_loyalty_tier_appearance.sql  -  Apariencia de niveles de fidelizacion
-- Agrega color distintivo (hex) e icono (key) a loyalty_tiers.
-- Ejecutar despues de 009_clients_seed.sql
-- =====================================================================

ALTER TABLE loyalty_tiers
  ADD COLUMN color VARCHAR(20) NOT NULL DEFAULT '#E8551C' AFTER benefits,
  ADD COLUMN icon  VARCHAR(40) NOT NULL DEFAULT 'award'   AFTER color;

-- Apariencia para los niveles sembrados en 009_clients_seed.sql.
UPDATE loyalty_tiers SET color = '#CD7F32', icon = 'shield'  WHERE id = 1; -- Bronce
UPDATE loyalty_tiers SET color = '#9CA3AF', icon = 'medal'   WHERE id = 2; -- Plata
UPDATE loyalty_tiers SET color = '#D4AF37', icon = 'crown'   WHERE id = 3; -- Oro
