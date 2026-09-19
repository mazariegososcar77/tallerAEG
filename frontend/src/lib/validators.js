// Reglas de formato de Guatemala y de correo, iguales a las del servidor (backend/src/utils/guatemala.js),
// para avisarle al usuario ANTES de enviar el formulario, con un mensaje que dice que corregir.
// El servidor vuelve a validar todo: esto es solo para dar el aviso de inmediato.

/** NIT sin guion ni espacios y en mayusculas. */
export const normalizeNit = (v) => String(v ?? '').replace(/[\s-]/g, '').toUpperCase();

/** Al menos 6 caracteres sin contar el guion: numeros y, al final, un digito o la letra K (maximo 12). */
export const isValidNit = (v) => /^\d{5,11}[\dK]$/.test(normalizeNit(v));

/** DPI (CUI): exactamente 13 numeros. */
export const isValidDpi = (v) => /^\d{13}$/.test(String(v ?? '').replace(/[\s-]/g, ''));

/** Telefono de Guatemala: 8 numeros (acepta 5555-1234 o +502 5555 1234). */
export function isValidPhone(v) {
  let digits = String(v ?? '').replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('502')) digits = digits.slice(3);
  return digits.length === 8;
}

/** Correo con formato real: algo@dominio.ext (el .ext de al menos 2 letras). */
export const isValidEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v ?? '').trim());

export const MENSAJES = {
  nit: 'El NIT debe tener mínimo 6 caracteres sin contar el guion (números y, al final, un dígito o K). Ejemplo: 1234567-8.',
  dpi: 'El DPI debe tener exactamente 13 números. Ejemplo: 2819254100101.',
  phone: 'El teléfono debe tener 8 números. Ejemplo: 5555-1234.',
  email: 'no es un correo electrónico válido (ejemplo: nombre@empresa.com).',
};
