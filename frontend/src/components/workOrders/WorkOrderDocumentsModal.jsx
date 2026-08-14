// VENTANA: Documentos adjuntos de una orden de trabajo.
//
// Aquí se sube la papelería de TERCEROS que acompaña al trabajo: la factura del
// taller de torneado, un certificado de bobinado, la cotización de un proveedor, el
// recibo que el cliente mandó por foto. Cada archivo lleva un título puesto a mano,
// porque el nombre con el que llega casi nunca dice nada ("scan_0012.pdf").
//
// Cumple dos papeles con el mismo componente:
//  - Sección normal de la orden, para consultar o agregar documentos cuando sea.
//  - Paso OBLIGATORIO antes de facturar (`stepMode`): ahí el botón de cerrar se
//    convierte en "Confirmar y continuar", que es lo que deja constancia de que
//    alguien revisó los documentos y destraba la facturación de esa orden.
import { useState, useEffect, useRef } from 'react';
import { FileText, Upload, Trash2, Download, Eye, X, CheckCircle2, AlertTriangle } from 'lucide-react';
import { workOrdersApi } from '../../api/workOrdersApi.js';
import { useAuth } from '../../hooks/useAuth.js';
import { notify } from '../../lib/toast.js';
import Modal from '../ui/Modal.jsx';
import Button from '../ui/Button.jsx';
import Input from '../ui/Input.jsx';
import Spinner from '../ui/Spinner.jsx';
import ConfirmDialog from '../ui/ConfirmDialog.jsx';
import PdfViewerModal from '../ui/PdfViewerModal.jsx';

// El adjunto puede ser cualquier formato (Word, Excel, imagen); solo cuando es
// PDF tiene sentido ofrecer "ver aqui" en vez de abrirlo aparte.
function isPdf(doc) {
  return doc.mime_type === 'application/pdf' || /\.pdf$/i.test(doc.original_name || doc.title || '');
}

// Lo que el navegador ofrece al abrir el selector de archivos. Es la misma lista
// que valida el backend (upload.middleware.js): si aquí se agrega algo, allá
// también, o el archivo se sube y el servidor lo rechaza.
const ACCEPT = '.pdf,.txt,.csv,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.webp,.heic,.heif,.gif,.bmp,.tif,.tiff';

// Muestra el tamaño en la unidad que se lee mejor: 847 KB en vez de 0.83 MB.
function formatSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function WorkOrderDocumentsModal({ open, onClose, order, stepMode = false, onConfirmed }) {
  const { hasPermission } = useAuth();
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [toDelete, setToDelete] = useState(null);
  const [viewing, setViewing] = useState(null); // documento PDF que se esta viendo en el visor
  const fileInput = useRef(null);

  const canManage = hasPermission('work-order-documents.manage');
  const canDelete = hasPermission('work-order-documents.delete');

  useEffect(() => {
    if (!open || !order?.id) return;
    setLoading(true);
    setTitle('');
    setFile(null);
    workOrdersApi
      .documents(order.id)
      .then(setDocs)
      .catch((e) => notify.error(e.message))
      .finally(() => setLoading(false));
  }, [open, order?.id]);

  // Sube el archivo elegido con su título. El título es obligatorio: es lo que se
  // va a leer en la lista, no el nombre del archivo.
  const handleUpload = async () => {
    if (!file) return notify.error('Elegí un archivo para adjuntar');
    if (!title.trim()) return notify.error('Ponele un título al documento');
    setUploading(true);
    try {
      const created = await workOrdersApi.addDocument(order.id, file, title.trim());
      setDocs((prev) => [created, ...prev]);
      setTitle('');
      setFile(null);
      if (fileInput.current) fileInput.current.value = '';
      notify.success('Documento adjuntado');
    } catch (e) {
      notify.error(e.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    try {
      await workOrdersApi.removeDocument(order.id, toDelete.id);
      setDocs((prev) => prev.filter((d) => d.id !== toDelete.id));
      notify.success('Documento eliminado');
    } catch (e) {
      notify.error(e.message);
    } finally {
      setToDelete(null);
    }
  };

  // Deja constancia de la revisión y devuelve el control a quien abrió el paso
  // (finalizar el reporte o generar la factura), que sigue con lo suyo.
  const handleConfirm = async () => {
    setConfirming(true);
    try {
      await workOrdersApi.reviewDocuments(order.id);
      onConfirmed?.();
    } catch (e) {
      notify.error(e.message);
      setConfirming(false);
    }
  };

  const alreadyReviewed = Boolean(order?.documents_reviewed_at);

  return (
    <>
      <Modal
        open={open}
        onClose={confirming ? undefined : onClose}
        title={`Documentos — Orden No. ${order?.number || ''}`}
        size="lg"
        accentColor="#CA8A04"
        footer={
          stepMode ? (
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="outline" onClick={onClose} disabled={confirming}>Cancelar</Button>
              <Button onClick={handleConfirm} loading={confirming}>
                <CheckCircle2 size={16} />
                {docs.length === 0 ? 'No hay documentos, continuar' : 'Confirmar y continuar'}
              </Button>
            </div>
          ) : (
            <div className="flex justify-end">
              <Button variant="outline" onClick={onClose}>Cerrar</Button>
            </div>
          )
        }
      >
        {/* En modo paso se explica por qué apareció esta ventana: el usuario venía
            presionando "Finalizar Reporte" o "Generar Factura", no pidió esto. */}
        {stepMode && (
          <div className="mb-4 flex gap-3 rounded-lg border border-orange-500/40 bg-orange-500/10 p-3">
            <AlertTriangle size={18} className="mt-0.5 shrink-0 text-orange-500" />
            <p className="text-sm text-content">
              Antes de facturar, revisá si hay documentos de terceros que adjuntar a esta orden
              (facturas de subcontratos, certificados, cotizaciones de proveedores).
              <strong> Si no hay ninguno, confirmá para continuar</strong> — queda registrado que
              se revisó.
            </p>
          </div>
        )}

        {!stepMode && alreadyReviewed && (
          <p className="mb-4 flex items-center gap-2 text-sm text-muted">
            <CheckCircle2 size={16} className="text-emerald-500" />
            Documentos revisados el {new Date(order.documents_reviewed_at).toLocaleDateString()}.
          </p>
        )}

        {/* Alta de un documento */}
        {canManage && (
          <div className="mb-5 space-y-3 rounded-lg border border-line bg-surface2 p-4">
            <Input
              label="Título del documento"
              placeholder="Ej: Factura torneado El Progreso"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <div>
              <label className="mb-1 block text-sm font-medium text-muted">Archivo</label>
              <input
                ref={fileInput}
                type="file"
                accept={ACCEPT}
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-content
                  file:mr-3 file:rounded file:border-0 file:bg-navy-700 file:px-3 file:py-1 file:text-white"
              />
              <p className="mt-1 text-xs text-muted">
                PDF, texto, Word, Excel o imagen. Hasta 20 MB.
              </p>
            </div>
            <Button onClick={handleUpload} loading={uploading} disabled={!file || !title.trim()}>
              <Upload size={16} /> Adjuntar
            </Button>
          </div>
        )}

        {/* Lista */}
        {loading ? (
          <div className="flex justify-center py-8"><Spinner size={24} /></div>
        ) : docs.length === 0 ? (
          <div className="py-8 text-center text-muted">
            <FileText size={40} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">Esta orden no tiene documentos adjuntos</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {docs.map((d) => (
              <li key={d.id} className="flex items-center gap-3 rounded-lg border border-line p-3">
                <FileText size={20} className="shrink-0 text-orange-500" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-content">{d.title}</p>
                  <p className="truncate text-xs text-muted">
                    {d.original_name} {formatSize(d.size_bytes) && `· ${formatSize(d.size_bytes)}`}
                    {d.uploaded_by_name && ` · ${d.uploaded_by_name}`}
                  </p>
                </div>
                {/* Si es PDF, se puede ver dentro de la app (como el resto del sistema,
                    nunca en otra pestaña). Cualquier otro formato (Word, Excel, imagen)
                    no tiene visor propio aqui, asi que ese boton abre/descarga tal
                    como llego. */}
                {isPdf(d) && (
                  <button
                    type="button"
                    onClick={() => setViewing(d)}
                    title="Ver PDF"
                    className="shrink-0 rounded p-2 text-navy-700 hover:bg-surface2"
                  >
                    <Eye size={16} />
                  </button>
                )}
                <a
                  href={d.file_url}
                  target="_blank"
                  rel="noreferrer"
                  title={isPdf(d) ? 'Descargar' : 'Abrir o descargar'}
                  className="shrink-0 rounded p-2 text-navy-700 hover:bg-surface2"
                >
                  <Download size={16} />
                </a>
                {canDelete && (
                  <button
                    type="button"
                    onClick={() => setToDelete(d)}
                    title="Eliminar documento"
                    className="shrink-0 rounded p-2 text-red-500 hover:bg-surface2"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Modal>

      <ConfirmDialog
        open={toDelete != null}
        onClose={() => setToDelete(null)}
        onConfirm={handleDelete}
        title="Eliminar documento"
        message={`Se va a eliminar "${toDelete?.title}". Esta accion no se puede deshacer.`}
        confirmText="Eliminar"
      />

      <PdfViewerModal
        open={viewing != null}
        onClose={() => setViewing(null)}
        url={viewing?.file_url}
        fileName={viewing?.title || 'documento'}
        title={viewing?.title}
      />
    </>
  );
}
