import { getLoyaltyIcon, DEFAULT_LOYALTY_COLOR } from '../../lib/loyalty.js';

/**
 * Pill con el icono distintivo y el color del nivel de fidelizacion.
 * Acepta `name`, `color` (hex) e `icon` (key); admite tanto la forma del tier
 * (name/color/icon) como la publica del cliente (loyalty_tier_*).
 *
 * En palabras simples: es la "etiquetita" redondeada (por ejemplo "Oro" o
 * "Plata") que se muestra junto al nombre de un cliente para indicar su nivel
 * de fidelizacion, con su propio color e icono. Se usa en las pantallas donde
 * aparece informacion de clientes.
 *
 * Props:
 * - name: el nombre del nivel a mostrar (ej. "Oro"). Si no viene, no se
 *   muestra nada.
 * - color: el color de la etiqueta (codigo hexadecimal); si no se manda, usa
 *   un color por defecto.
 * - icon: que icono mostrar junto al nombre.
 * - size / className: tamano del icono y clases de estilo adicionales.
 */
export default function LoyaltyTierTag({ name, color, icon, size = 14, className = '' }) {
  if (!name) return null; // sin nivel de fidelizacion, no se dibuja nada
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
