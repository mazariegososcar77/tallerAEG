/** Wrapper tematico sobre react-hot-toast. Usar SIEMPRE esto, no la libreria directa. */
import { createElement as h } from 'react';
import { toast } from 'react-hot-toast';
import { X } from 'lucide-react';

// Contenido del toast: el mensaje + un boton para cerrarlo manualmente.
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

export const notify = {
  success: (message) => toast.success(withClose(message)),
  error: (message) => toast.error(withClose(message)),
  info: (message) => toast(withClose(message)),
};
