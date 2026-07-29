/**
 * CONFIGURACION GENERAL DEL SISTEMA.
 *
 * Este archivo es la **fuente de verdad** de que ajustes existen: su tipo, sus
 * limites y su valor por defecto (`SETTINGS_SCHEMA` de abajo). La tabla en la
 * base de datos es de clave/valor, asi que para agregar un ajuste nuevo basta
 * con agregarlo aqui — **no hace falta una migracion nueva**. Si la base no
 * tiene la fila todavia, se usa el valor por defecto de esta lista.
 *
 * Los valores por defecto son los que el sistema ya usaba escritos a mano en el
 * codigo, para que nada cambie de aspecto hasta que alguien edite la
 * configuracion a proposito.
 */
import * as settingsRepository from '../repositories/settingsRepository.js';
import { ApiError } from '../utils/ApiError.js';

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

export const SETTINGS_SCHEMA = {
  // ── Apariencia ───────────────────────────────────────────────────────
  // Tema que ve un usuario que nunca eligio uno. 'system' = seguir la
  // preferencia del celular/computadora. Cada usuario puede cambiarlo despues
  // con el boton sol/luna, y su eleccion manda sobre este valor.
  theme_default:    { type: 'enum', values: ['light', 'dark', 'system'], default: 'light' },
  // Color principal de marca (verde oscuro) y color de acento (amarillo).
  color_primary:    { type: 'color', default: '#164B2C' },
  color_accent:     { type: 'color', default: '#CA8A04' },

  // ── Datos del taller (se imprimen en el encabezado/pie de los PDF) ───
  company_name:     { type: 'text', default: 'TALLER AEG', max: 120 },
  company_tagline:  { type: 'text', default: 'Taller de Embobinado Industrial', max: 160 },
  company_address:  { type: 'text', default: 'Guatemala, Guatemala', max: 200 },
  company_phone:    { type: 'text', default: '(+502) 0000-0000', max: 60 },
  company_email:    { type: 'text', default: '', max: 120 },
  company_nit:      { type: 'text', default: '', max: 40 },

  // ── Documentos ───────────────────────────────────────────────────────
  // Dias de vigencia que se le pone por defecto a una cotizacion nueva (y que
  // se imprime en el pie del PDF de cotizacion).
  quote_valid_days: { type: 'int', default: 15, min: 1, max: 365 },
};

/** Lista de claves validas (lo que el frontend puede mandar a guardar). */
export const SETTING_KEYS = Object.keys(SETTINGS_SCHEMA);

/** Todos los ajustes con su valor por defecto (sin tocar la base de datos). */
export function defaults() {
  return Object.fromEntries(SETTING_KEYS.map((k) => [k, SETTINGS_SCHEMA[k].default]));
}

// Convierte el texto guardado en la base al tipo que corresponde. Si el valor
// guardado es basura (una migracion a medias, alguien editando la tabla a mano),
// se cae al valor por defecto en vez de romper la app.
function coerce(key, raw) {
  const def = SETTINGS_SCHEMA[key];
  if (raw == null) return def.default;
  const value = String(raw);
  switch (def.type) {
    case 'int': {
      const n = Number.parseInt(value, 10);
      if (Number.isNaN(n) || n < def.min || n > def.max) return def.default;
      return n;
    }
    case 'color':
      return HEX_COLOR.test(value) ? value.toUpperCase() : def.default;
    case 'enum':
      return def.values.includes(value) ? value : def.default;
    default:
      return value;
  }
}

/**
 * Devuelve la configuracion completa: lo que hay en la base, y para lo que no
 * hay, el valor por defecto. Siempre devuelve todas las claves, asi el frontend
 * y los PDF nunca reciben `undefined`.
 */
export async function getSettings() {
  let stored = {};
  try {
    stored = await settingsRepository.getAll();
  } catch (e) {
    // Si la migracion 032 todavia no se aplico, la tabla no existe. En ese caso
    // el sistema sigue funcionando con los valores por defecto (que son los que
    // ya usaba antes de que existiera esta pantalla) en vez de caerse.
    if (e.code !== 'ER_NO_SUCH_TABLE') throw e;
    return defaults();
  }
  return Object.fromEntries(SETTING_KEYS.map((k) => [k, coerce(k, stored[k])]));
}

// Valida un valor que llega del formulario. Devuelve el valor ya normalizado o
// lanza un 400 con un mensaje entendible.
function validateValue(key, value) {
  const def = SETTINGS_SCHEMA[key];
  switch (def.type) {
    case 'int': {
      const n = Number.parseInt(value, 10);
      if (Number.isNaN(n) || n < def.min || n > def.max) {
        throw new ApiError(400, `"${key}" debe ser un numero entre ${def.min} y ${def.max}`);
      }
      return n;
    }
    case 'color': {
      const v = String(value ?? '').trim().toUpperCase();
      if (!HEX_COLOR.test(v)) throw new ApiError(400, `"${key}" debe ser un color en formato #RRGGBB`);
      return v;
    }
    case 'enum': {
      const v = String(value ?? '').trim();
      if (!def.values.includes(v)) {
        throw new ApiError(400, `"${key}" debe ser uno de: ${def.values.join(', ')}`);
      }
      return v;
    }
    default: {
      const v = String(value ?? '').trim();
      if (v.length > def.max) throw new ApiError(400, `"${key}" no puede pasar de ${def.max} caracteres`);
      return v;
    }
  }
}

/**
 * Guarda solo los ajustes que vengan en el objeto (los demas quedan como
 * estaban). Rechaza claves desconocidas a proposito: asi un error de tipeo en el
 * frontend se nota en vez de guardar basura en la tabla.
 */
export async function updateSettings(payload) {
  const entries = {};
  for (const [key, value] of Object.entries(payload || {})) {
    if (!SETTINGS_SCHEMA[key]) throw new ApiError(400, `Ajuste desconocido: ${key}`);
    entries[key] = validateValue(key, value);
  }
  if (!Object.keys(entries).length) throw new ApiError(400, 'No se envio ningun ajuste para guardar');
  await settingsRepository.saveMany(entries);
  return getSettings();
}
