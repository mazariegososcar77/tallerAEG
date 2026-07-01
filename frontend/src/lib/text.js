// Utilidades para forzar MAYÚSCULAS en los campos de texto de la app.
//
// El truco para no perder la posición del cursor con inputs controlados de React:
// se muta `el.value` a mayúsculas ANTES de propagar el onChange. Así el value que
// React vuelve a escribir en el DOM coincide con el que ya tiene el elemento y el
// navegador no reubica el cursor al final.

/** Pasa el valor del elemento a mayúsculas conservando la selección/cursor. */
export function uppercaseInPlace(el) {
  if (!el || typeof el.value !== 'string') return;
  const { selectionStart, selectionEnd } = el;
  el.value = el.value.toUpperCase();
  try { el.setSelectionRange(selectionStart, selectionEnd); } catch { /* input sin rango de selección (number/date/…) */ }
}

/**
 * Envuelve un manejador onChange para que el texto se convierta a mayúsculas
 * mientras el usuario escribe. Úsalo en inputs/textarea crudos:
 *   onChange={withUppercase(e => set('nombre', e.target.value))}
 */
export const withUppercase = (handler) => (e) => {
  uppercaseInPlace(e.target);
  handler?.(e);
};
