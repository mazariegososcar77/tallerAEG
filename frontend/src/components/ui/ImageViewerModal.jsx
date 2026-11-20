import { useEffect, useState } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Muestra una foto en grande encima de la pantalla en la que se esta, con
 * zoom con un toque/clic (pasa a tamaño natural dentro de un area con scroll,
 * asi el pinch-to-zoom nativo del celular tambien funciona) y flechas para
 * pasar a la siguiente/anterior si hay mas de una. Se usa en las galerias de
 * fotos (ej. PhotoStageGallery) para poder revisar un detalle (una placa, una
 * medida) sin depender de que la miniatura alcance.
 *
 * Props:
 * - `open`/`onClose`: visibilidad.
 * - `images`: arreglo de `{ url, caption? }`.
 * - `index`: cual de `images` se esta mostrando.
 * - `onIndexChange(nuevoIndex)`: se llama al usar las flechas o las teclas
 *   izquierda/derecha.
 */
export default function ImageViewerModal({ open, onClose, images, index, onIndexChange }) {
  const [zoomed, setZoomed] = useState(false);

  useEffect(() => { setZoomed(false); }, [index, open]);

  useEffect(() => {
    if (!open) return undefined;
    const hasMultiple = images.length > 1;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
      if (hasMultiple && e.key === 'ArrowLeft') onIndexChange((index - 1 + images.length) % images.length);
      if (hasMultiple && e.key === 'ArrowRight') onIndexChange((index + 1) % images.length);
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, index, images.length, onClose, onIndexChange]);

  if (!open) return null;

  const photo = images[index];
  const hasMultiple = images.length > 1;
  const iconBtn = 'rounded-full bg-black/50 p-2 text-white hover:bg-black/70';

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black/95 animate-fade-in"
      onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <div className="flex shrink-0 items-center justify-between gap-2 p-3 text-white">
        <span className="truncate text-sm">
          {photo?.caption || (hasMultiple ? `${index + 1} / ${images.length}` : '')}
        </span>
        <button type="button" onClick={onClose} className={iconBtn} aria-label="Cerrar">
          <X size={20} />
        </button>
      </div>

      <div className={`relative flex-1 ${zoomed ? 'overflow-auto' : 'flex items-center justify-center overflow-hidden'}`}>
        <img
          src={photo?.url}
          alt={photo?.caption || 'Foto'}
          onClick={() => setZoomed((z) => !z)}
          style={{ touchAction: zoomed ? 'pinch-zoom' : 'manipulation' }}
          className={zoomed ? 'max-w-none cursor-zoom-out' : 'max-h-full max-w-full cursor-zoom-in object-contain'}
        />
        {hasMultiple && !zoomed && (
          <>
            <button
              type="button"
              onClick={() => onIndexChange((index - 1 + images.length) % images.length)}
              className={`absolute left-2 top-1/2 -translate-y-1/2 ${iconBtn}`}
              aria-label="Foto anterior"
            >
              <ChevronLeft size={24} />
            </button>
            <button
              type="button"
              onClick={() => onIndexChange((index + 1) % images.length)}
              className={`absolute right-2 top-1/2 -translate-y-1/2 ${iconBtn}`}
              aria-label="Foto siguiente"
            >
              <ChevronRight size={24} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
