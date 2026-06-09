import { getLoyaltyIcon, DEFAULT_LOYALTY_COLOR } from '../../lib/loyalty.js';

/**
 * Pill con el icono distintivo y el color del nivel de fidelizacion.
 * Acepta `name`, `color` (hex) e `icon` (key); admite tanto la forma del tier
 * (name/color/icon) como la publica del cliente (loyalty_tier_*).
 */
export default function LoyaltyTierTag({ name, color, icon, size = 14, className = '' }) {
  if (!name) return null;
  const tone = color || DEFAULT_LOYALTY_COLOR;
  const Icon = getLoyaltyIcon(icon);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}
      style={{ backgroundColor: `${tone}1f`, color: tone }}
    >
      <Icon size={size} />
      {name}
    </span>
  );
}
