import { useEffect } from 'react';
import { X } from 'lucide-react';

/**
 * Es la "ventana emergente" (el recuadro que aparece encima de todo, con un
 * fondo oscuro detrás) que se usa para formularios cortos, confirmaciones o
 * detalles, sin salir de la pantalla en la que se está. Se puede cerrar
 * presionando la tecla ESC o con el botón "X". `accentColor` es opcional y
 * solo pinta una franja de color arriba del recuadro para darle un toque
 * distintivo.
 *
 * A propósito NO se cierra con un clic en el fondo: un clic accidental
 * (fuera del recuadro por error, o en celular al hacer scroll) borraba todo
 * lo que ya se había escrito en el formulario, exactamente igual que
 * apretar la "X" pero sin querer. Quien de verdad quiere salir tiene la "X"
 * o Esc, los dos visibles y sin ese riesgo.
 *
 * Modal centrado con overlay. Cierra con ESC o con la "X".
 * `accentColor` (hex) pinta un borde superior de acento (4px).
 */
export default function Modal({ open, onClose, title, children, footer, size = 'md', accentColor }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  const widths = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-5xl' };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-navy-900/50 p-4 animate-fade-in"
    >
      <div
        className={`flex max-h-modal w-full ${widths[size]} flex-col rounded-xl bg-surface shadow-xl animate-slide-up border border-line`}
        style={accentColor ? { borderTop: `4px solid ${accentColor}` } : undefined}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-line px-5 py-4">
          <h3 className="text-base font-semibold text-heading sm:text-lg">{title}</h3>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-muted hover:bg-hover hover:text-content"
            aria-label="Cerrar"
          >
            <X size={20} />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
        {footer && (
          <div className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-line px-5 py-3">{footer}</div>
        )}
      </div>
    </div>
  );
}
