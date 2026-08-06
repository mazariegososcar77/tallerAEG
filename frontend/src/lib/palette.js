/**
 * Aplica los COLORES DE MARCA que se eligen en Configuracion > Configuracion
 * general (color principal y color de acento).
 *
 * Como funciona: de cada color elegido se calcula una escala de 10 tonos (del
 * mas claro al mas oscuro) mezclandolo con blanco y con negro, y esos tonos se
 * escriben como variables CSS en la pagina. Toda la interfaz esta hecha con esas
 * variables (ver index.css y tailwind.config.js), asi que el cambio se ve al
 * instante y sin recompilar nada.
 *
 * Si el color elegido es el de la marca (el de siempre), NO se escribe nada y se
 * dejan los tonos originales de index.css, que estan afinados a mano — asi la
 * apariencia por defecto del sistema no cambia ni un pixel.
 */

/** Colores de marca de Taller AEG (los mismos valores por defecto del backend). */
export const BRAND_PRIMARY = '#164B2C';
export const BRAND_ACCENT = '#CA8A04';

// Cuanto se mezcla cada tono con blanco (valores positivos) o con negro
// (negativos) respecto al color elegido. El tono en 0 es el color tal cual:
// para el principal es el 700 y para el acento el 500, que son los que se usan
// en casi toda la interfaz.
const SCALE_PRIMARY = { 50: 0.92, 100: 0.82, 200: 0.66, 300: 0.48, 400: 0.32, 500: 0.18, 600: 0.08, 700: 0, 800: -0.14, 900: -0.28 };
const SCALE_ACCENT = { 50: 0.93, 100: 0.85, 200: 0.70, 300: 0.48, 400: 0.24, 500: 0, 600: -0.14, 700: -0.28, 800: -0.42, 900: -0.54 };

/** Convierte "#RRGGBB" a [r, g, b]. Devuelve null si el texto no es un color. */
export function hexToRgb(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || '').trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Convierte [r, g, b] a "#RRGGBB". */
export function rgbToHex([r, g, b]) {
  const h = (v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`.toUpperCase();
}

// Mezcla el color con blanco (amount > 0) o con negro (amount < 0).
function mix(rgb, amount) {
  const target = amount > 0 ? 255 : 0;
  const t = Math.abs(amount);
  return rgb.map((c) => c + (target - c) * t);
}

/**
 * Dice si un color es "claro", para saber si encima le queda mejor texto negro
 * o blanco (se usa en la vista previa de la pantalla de configuracion).
 */
export function isLight(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return false;
  // Luminancia percibida aproximada (los ojos ven el verde mas brillante).
  const [r, g, b] = rgb;
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6;
}

/**
 * Calcula los 10 tonos de un color. Devuelve `{ 50: [r,g,b], ... }`.
 * `kind` es 'primary' o 'accent' (cambian los tonos porque el color de marca
 * principal es oscuro y el de acento es medio).
 */
export function buildScale(hex, kind = 'primary') {
  const base = hexToRgb(hex);
  if (!base) return null;
  const ratios = kind === 'accent' ? SCALE_ACCENT : SCALE_PRIMARY;
  return Object.fromEntries(
    Object.entries(ratios).map(([step, amount]) => [step, amount === 0 ? base : mix(base, amount)]),
  );
}

// Escribe (o borra) las variables CSS de una escala en el elemento raiz.
function writeScale(root, name, scale) {
  for (const step of [50, 100, 200, 300, 400, 500, 600, 700, 800, 900]) {
    const prop = `--c-${name}-${step}`;
    if (!scale) root.style.removeProperty(prop);
    else root.style.setProperty(prop, scale[step].map(Math.round).join(' '));
  }
}

/**
 * Aplica los colores de marca a toda la pagina. Se llama al cargar la app (con
 * lo que venga guardado en la configuracion) y de nuevo cada vez que alguien
 * cambia los colores en la pantalla de configuracion.
 */
export function applyPalette({ primary, accent } = {}) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;

  const usePrimary = (primary || BRAND_PRIMARY).toUpperCase();
  const useAccent = (accent || BRAND_ACCENT).toUpperCase();

  // Con los colores de marca no se escribe nada: se usan los tonos afinados a
  // mano de index.css.
  writeScale(root, 'navy', usePrimary === BRAND_PRIMARY ? null : buildScale(usePrimary, 'primary'));
  writeScale(root, 'orange', useAccent === BRAND_ACCENT ? null : buildScale(useAccent, 'accent'));

  // Version hex de los dos colores, para los estilos en linea.
  if (usePrimary === BRAND_PRIMARY) root.style.removeProperty('--c-primary');
  else root.style.setProperty('--c-primary', usePrimary);
  if (useAccent === BRAND_ACCENT) root.style.removeProperty('--c-accent');
  else root.style.setProperty('--c-accent', useAccent);
}
