// Este archivo hace que, en ciertos campos de texto de la app, lo que el
// usuario escribe se convierta automáticamente a MAYÚSCULAS mientras escribe
// (por ejemplo para nombres o códigos que siempre deben ir en mayúsculas).
//
// El truco para no perder la posición del cursor con inputs controlados de React:
// se muta `el.value` a mayúsculas ANTES de propagar el onChange. Así el value que
// React vuelve a escribir en el DOM coincide con el que ya tiene el elemento y el
// navegador no reubica el cursor al final.

/** Convierte a mayúsculas lo que hay escrito en el campo, sin mover el cursor. */
export function uppercaseInPlace(el) {
  if (!el || typeof el.value !== 'string') return;
  const { selectionStart, selectionEnd } = el;
  el.value = el.value.toUpperCase();
  try { el.setSelectionRange(selectionStart, selectionEnd); } catch { /* input sin rango de selección (number/date/…) */ }
}

/**
 * Se usa en un campo de texto para que, mientras el usuario escribe, el texto
 * se convierta a mayúsculas automáticamente. Ejemplo de uso:
 *   onChange={withUppercase(e => set('nombre', e.target.value))}
 */
export const withUppercase = (handler) => (e) => {
  uppercaseInPlace(e.target);
  handler?.(e);
};
