import { useEffect, useState } from 'react';
import { X, Download, ExternalLink, AlertTriangle } from 'lucide-react';
import { fetchPdfBlob, saveBlob } from '../../lib/pdf.js';
import { useIsMobile } from '../../hooks/useIsMobile.js';
import Spinner from './Spinner.jsx';

/**
 * Visor de PDF dentro de la misma aplicacion: en vez de abrir el PDF en otra
 * pestaña del navegador, lo muestra en una ventana grande encima de la pantalla
 * en la que se esta, con botones para descargarlo o cerrarlo. Se usa en todos
 * los botones de "Visualizar PDF" del sistema (cotizaciones, ordenes de
 * trabajo, ordenes de servicio, reportes y facturas).
 *
 * Props:
 * - `open`      : si la ventana esta abierta.
 * - `onClose`   : se llama al cerrarla (ESC, clic en el fondo o boton X).
 * - `url`       : endpoint del PDF, p.ej. `/api/invoices/12/pdf`.
 * - `fileName`  : nombre con el que se guarda si el usuario lo descarga.
 * - `title`     : texto del encabezado de la ventana.
 * - `floatingAction` : opcional, `{ icon, label, onClick }` para un boton
 *   flotante sobre el PDF (p.ej. "Certificar" en una factura pendiente). Solo
 *   se muestra si el PDF ya cargo sin error.
 *
 * El PDF se pide al servidor con el token de la sesion y se muestra desde la
 * memoria del navegador (nunca queda en disco salvo que el usuario descargue).
 */
export default function PdfViewerModal({ open, onClose, url, fileName = 'documento.pdf', title = 'Vista previa del PDF', floatingAction }) {
  const isMobile = useIsMobile();
  const [blob, setBlob] = useState(null);
  const [blobUrl, setBlobUrl] = useState(null);
  const [error, setError] = useState(null);

  // Trae el PDF cada vez que se abre la ventana (o cambia el documento) y libera
  // la memoria al cerrarla.
  useEffect(() => {
    if (!open || !url) return undefined;
    let cancelled = false;
    let objectUrl = null;
    setBlob(null);
    setBlobUrl(null);
    setError(null);
    fetchPdfBlob(url)
      .then((b) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(b);
        setBlob(b);
        setBlobUrl(objectUrl);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message || 'No se pudo cargar el PDF');
      });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [open, url]);

  // Cerrar con ESC y no dejar que se mueva la pantalla de atras.
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

  const iconBtn =
    'rounded-md p-1.5 text-muted transition-colors hover:bg-hover hover:text-content disabled:opacity-40';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-navy-900/60 p-2 sm:p-4 animate-fade-in"
      onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <div className="flex h-full max-h-[95vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-xl animate-slide-up">
        {/* Encabezado con el nombre del documento y las acciones */}
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-line px-4 py-3">
          <h3 className="truncate text-sm font-semibold text-heading sm:text-base">{title}</h3>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => blob && saveBlob(blob, fileName)}
              disabled={!blob}
              className={iconBtn}
              title="Descargar PDF"
              aria-label="Descargar PDF"
            >
              <Download size={18} />
            </button>
            {/* Escape para celulares cuyo navegador no puede dibujar PDF dentro
                de la app: ahi si se abre con el visor del propio dispositivo. */}
            {isMobile && (
              <button
                type="button"
                onClick={() => blobUrl && window.open(blobUrl, '_blank')}
                disabled={!blobUrl}
                className={iconBtn}
                title="Abrir con el visor del dispositivo"
                aria-label="Abrir con el visor del dispositivo"
              >
                <ExternalLink size={18} />
              </button>
            )}
            <button type="button" onClick={onClose} className={iconBtn} title="Cerrar" aria-label="Cerrar">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Cuerpo: el PDF, la ruedita de carga, o el mensaje de error */}
        <div className="relative flex flex-1 items-center justify-center overflow-hidden bg-app">
          {error ? (
            <div className="flex flex-col items-center gap-2 p-6 text-center">
              <AlertTriangle size={32} className="text-red-500" />
              <p className="text-sm font-medium text-content">{error}</p>
              <p className="text-xs text-muted">Intenta de nuevo o descarga el archivo.</p>
            </div>
          ) : !blobUrl ? (
            <div className="flex flex-col items-center gap-2 text-muted">
              <Spinner size={28} />
              <p className="text-xs">Generando PDF...</p>
            </div>
          ) : (
            <iframe
              src={`${blobUrl}#view=FitH`}
              title={title}
              className="h-full w-full border-0 bg-white"
            />
          )}
          {floatingAction && blobUrl && !error && (
            <button
              type="button"
              onClick={floatingAction.onClick}
              className="absolute bottom-5 right-5 z-10 flex items-center gap-2 rounded-full bg-orange-500 px-5 py-3 text-sm font-bold text-white shadow-lg transition-colors hover:bg-orange-600"
            >
              <floatingAction.icon size={18} /> {floatingAction.label}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
