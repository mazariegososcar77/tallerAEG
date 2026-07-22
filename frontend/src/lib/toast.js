/**
 * Este archivo controla las notificaciones (los mensajitos que aparecen en una
 * esquina de la pantalla, por ejemplo "Cliente guardado con éxito" o "Ocurrió
 * un error"). Usa una librería externa (react-hot-toast) pero le agrega los
 * colores/estilo de la app y un botón de "X" para cerrarlas a mano. En el
 * resto del código SIEMPRE se debe usar este archivo (el objeto `notify` de
 * abajo) y no la librería directamente, para que todas las notificaciones se
 * vean iguales.
 */
import { createElement as h } from 'react';
import { toast } from 'react-hot-toast';
import { X } from 'lucide-react';

// Arma el contenido visual de la notificación: el texto del mensaje más un
// botón para cerrarla manualmente antes de que desaparezca sola.
function withClose(message) {
  return (t) =>
    h('span', { className: 'flex items-center gap-3' }, [
      h('span', { key: 'msg' }, message),
      h(
        'button',
        {
          key: 'close',
          type: 'button',
          'aria-label': 'Cerrar',
          onClick: () => toast.dismiss(t.id),
          className: 'shrink-0 rounded p-0.5 text-white/70 transition-colors hover:text-white',
        },
        h(X, { size: 16 }),
      ),
    ]);
}

// Estas son las tres notificaciones que se usan en toda la app:
export const notify = {
  /** Muestra un aviso verde de éxito (ej. "Cliente guardado"). */
  success: (message) => toast.success(withClose(message)),
  /** Muestra un aviso rojo de error (ej. "No se pudo guardar"). */
  error: (message) => toast.error(withClose(message)),
  /** Muestra un aviso neutro informativo. */
  info: (message) => toast(withClose(message)),
};
