// Este archivo tiene las opciones de colores e iconos que se pueden elegir
// para cada "nivel de fidelización" de clientes (por ejemplo Oro, Plata,
// Bronce), usadas en la pantalla de Configuración > Fidelización.
import { Award, Medal, Crown, Trophy, Star, Gem, Shield, Sparkles, BadgeCheck, Heart } from 'lucide-react';

/** Lista de colores que se pueden elegir para un nivel de fidelización. */
export const LOYALTY_COLORS = [
  { key: 'gold', label: 'Dorado', value: '#D4AF37' },
  { key: 'silver', label: 'Plata', value: '#9CA3AF' },
  { key: 'bronze', label: 'Bronce', value: '#CD7F32' },
  { key: 'copper', label: 'Cobre', value: '#B87333' },
  { key: 'platinum', label: 'Platino', value: '#6B7280' },
  { key: 'emerald', label: 'Esmeralda', value: '#10B981' },
  { key: 'sapphire', label: 'Zafiro', value: '#2563EB' },
  { key: 'ruby', label: 'Rubi', value: '#DC2626' },
  { key: 'yellow', label: 'Amarillo', value: '#CA8A04' },
  { key: 'green', label: 'Verde oscuro', value: '#164B2C' },
];

/** Color que se usa por defecto si no se elige ninguno. */
export const DEFAULT_LOYALTY_COLOR = '#CA8A04';

/** Lista de iconos que se pueden elegir para un nivel de fidelización. */
export const LOYALTY_ICONS = [
  { key: 'award', label: 'Medalla', Icon: Award },
  { key: 'medal', label: 'Condecoracion', Icon: Medal },
  { key: 'crown', label: 'Corona', Icon: Crown },
  { key: 'trophy', label: 'Trofeo', Icon: Trophy },
  { key: 'star', label: 'Estrella', Icon: Star },
  { key: 'gem', label: 'Gema', Icon: Gem },
  { key: 'shield', label: 'Escudo', Icon: Shield },
  { key: 'sparkles', label: 'Destellos', Icon: Sparkles },
  { key: 'badge', label: 'Insignia', Icon: BadgeCheck },
  { key: 'heart', label: 'Corazon', Icon: Heart },
];

/** Icono que se usa por defecto si no se elige ninguno. */
export const DEFAULT_LOYALTY_ICON = 'award';

const ICON_MAP = Object.fromEntries(LOYALTY_ICONS.map((i) => [i.key, i.Icon]));

/** Busca el icono correspondiente a un nivel guardado (usa la medalla si no lo encuentra). */
export function getLoyaltyIcon(key) {
  return ICON_MAP[key] || Award;
}
