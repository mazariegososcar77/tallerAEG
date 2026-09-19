// Reglas de formato de Guatemala para los datos de un cliente: NIT, DPI (CUI) y teléfono. Las usan
// el esquema de validacion de la ruta y el servicio; el frontend tiene una copia en
// frontend/src/lib/validators.js con las mismas reglas para avisar antes de enviar.

/** NIT sin guion ni espacios y en mayusculas: "1234567-8" -> "12345678"; "123456-k" -> "123456K". */
export function normalizeNit(value) {
  return String(value ?? '').replace(/[\s-]/g, '').toUpperCase();
}

/**
 * Un NIT valido tiene al menos 6 caracteres sin contar el guion: los numeros del NIT y, al final,
 * su digito verificador (un numero o la letra K). Maximo 12.
 */
export function isValidNit(value) {
  return /^\d{5,11}[\dK]$/.test(normalizeNit(value));
}

/** DPI (CUI) solo con numeros: quita espacios y guiones. */
export function normalizeDpi(value) {
  return String(value ?? '').replace(/[\s-]/g, '');
}

/** El DPI (CUI) tiene exactamente 13 numeros. */
export function isValidDpi(value) {
  return /^\d{13}$/.test(normalizeDpi(value));
}

/** Solo los numeros del telefono; si trae el codigo de pais (+502) se lo quita. */
function phoneDigits(value) {
  let digits = String(value ?? '').replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('502')) digits = digits.slice(3);
  return digits;
}

/** Un telefono de Guatemala tiene 8 numeros (se acepta 5555-1234, 5555 1234 o +502 5555 1234). */
export function isValidPhone(value) {
  return phoneDigits(value).length === 8;
}

/** Telefono guardado de forma uniforme: "5555-1234". Si no es valido, se devuelve tal cual. */
export function formatPhone(value) {
  const digits = phoneDigits(value);
  return digits.length === 8 ? `${digits.slice(0, 4)}-${digits.slice(4)}` : String(value ?? '').trim();
}

export const MENSAJES = {
  nit: 'El NIT debe tener mínimo 6 caracteres sin contar el guion (números y, al final, un dígito o K). Ejemplo: 1234567-8.',
  dpi: 'El DPI debe tener exactamente 13 números. Ejemplo: 2819254100101.',
  phone: 'El teléfono debe tener 8 números. Ejemplo: 5555-1234.',
};
