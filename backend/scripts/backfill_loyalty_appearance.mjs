/**
 * Backfill no destructivo de la apariencia de los niveles de fidelizacion.
 * Agrega `color` (hex) e `icon` (key) a los niveles que aun no los tienen,
 * sin tocar el resto de sus datos. Aplica presets por nombre (Bronce/Plata/Oro)
 * y, para cualquier otro nivel, valores por defecto.
 *
 * Uso: node scripts/backfill_loyalty_appearance.mjs
 * (Para una instalacion limpia usa el seed normal: npm run seed)
 */
import { readCollection, writeCollection, now } from '../src/lib/jsonStore.js';

const DEFAULT_COLOR = '#E8551C';
const DEFAULT_ICON = 'award';

// Presets por nombre (sin distinguir mayusculas/acentos basicos).
const PRESETS = {
  bronce: { color: '#CD7F32', icon: 'shield' },
  plata: { color: '#9CA3AF', icon: 'medal' },
  oro: { color: '#D4AF37', icon: 'crown' },
};

const tiers = readCollection('loyalty_tiers');
let updated = 0;

for (const tier of tiers) {
  const needsColor = !tier.color;
  const needsIcon = !tier.icon;
  if (!needsColor && !needsIcon) continue;

  const preset = PRESETS[String(tier.name || '').trim().toLowerCase()];
  if (needsColor) tier.color = preset ? preset.color : DEFAULT_COLOR;
  if (needsIcon) tier.icon = preset ? preset.icon : DEFAULT_ICON;
  tier.updated_at = now();
  updated += 1;
}

if (updated) writeCollection('loyalty_tiers', tiers);

console.log('Backfill de apariencia de fidelizacion aplicado:');
console.log(`  ${updated} nivel(es) actualizado(s) con color/icono.`);
