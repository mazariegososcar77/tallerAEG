import { Award, Medal, Crown, Trophy, Star, Gem, Shield, Sparkles, BadgeCheck, Heart } from 'lucide-react';

/** Colores predefinidos (metales y piedras) para los niveles de fidelizacion. */
export const LOYALTY_COLORS = [
  { key: 'gold', label: 'Dorado', value: '#D4AF37' },
  { key: 'silver', label: 'Plata', value: '#9CA3AF' },
  { key: 'bronze', label: 'Bronce', value: '#CD7F32' },
  { key: 'copper', label: 'Cobre', value: '#B87333' },
  { key: 'platinum', label: 'Platino', value: '#6B7280' },
  { key: 'emerald', label: 'Esmeralda', value: '#10B981' },
  { key: 'sapphire', label: 'Zafiro', value: '#2563EB' },
  { key: 'ruby', label: 'Rubi', value: '#DC2626' },
  { key: 'orange', label: 'Naranja', value: '#E8551C' },
  { key: 'navy', label: 'Azul marino', value: '#16285C' },
];

export const DEFAULT_LOYALTY_COLOR = '#E8551C';

/** Iconos distintivos disponibles (lucide). Se guarda el `key` en BD. */
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

export const DEFAULT_LOYALTY_ICON = 'award';

const ICON_MAP = Object.fromEntries(LOYALTY_ICONS.map((i) => [i.key, i.Icon]));

/** Componente de icono lucide para un key (Award por defecto). */
export function getLoyaltyIcon(key) {
  return ICON_MAP[key] || Award;
}
