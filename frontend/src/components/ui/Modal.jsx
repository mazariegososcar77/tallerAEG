import { useEffect } from 'react';
import { X } from 'lucide-react';

/**
 * Modal centrado con overlay. Cierra con ESC o clic en el fondo.
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
      onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <div
        className={`flex max-h-[90vh] w-full ${widths[size]} flex-col rounded-xl bg-surface shadow-xl animate-slide-up border border-line`}
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
