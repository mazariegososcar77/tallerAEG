// PANTALLA: Lista de Cotizaciones. Muestra todas las cotizaciones hechas, con su
// número, cliente, equipo, estado (borrador/enviada/aprobada/rechazada/vencida) y
// total. Desde aquí se puede buscar, crear una cotización nueva, visualizar su
// PDF (en una ventana dentro de la app), descargarlo, editarla, eliminarla y — si
// ya está "aprobada" — convertirla en una Orden de Trabajo con el botón
// "Crear Orden".
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { quotesApi } from '../../api/quotesApi.js';
import { FileText, Plus, Search, Eye, Pencil, Trash2, Download, ClipboardList, Network, Mail } from 'lucide-react';
import { downloadPdf } from '../../lib/pdf.js';
import { notify } from '../../lib/toast.js';
import PdfViewerModal from '../../components/ui/PdfViewerModal.jsx';
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx';
import DocumentFlowModal from '../../components/documentFlow/DocumentFlowModal.jsx';
import SendQuoteEmailModal from '../../components/quotes/SendQuoteEmailModal.jsx';

const STATUS_LABELS = {
  borrador:  { label: 'Borrador',  color: '#94a3b8' },
  enviada:   { label: 'Enviada',   color: '#3b82f6' },
  aprobada:  { label: 'Aprobada',  color: '#10b981' },
  rechazada: { label: 'Rechazada', color: '#ef4444' },
  vencida:   { label: 'Vencida',   color: '#f59e0b' },
};

export default function QuotesPage() {
  const [quotes, setQuotes] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [pdfQuote, setPdfQuote] = useState(null); // cotizacion que se esta viendo en el visor de PDF
  const [toDelete, setToDelete] = useState(null); // cotizacion pendiente de confirmar su eliminacion
  const [flowSource, setFlowSource] = useState(null); // { type: 'quote', id } para el Mapa de Relaciones
  const [emailQuote, setEmailQuote] = useState(null); // cotizacion que se va a mandar por correo
  const navigate = useNavigate();

  // Descarga el PDF de la cotizacion (lo pide al servidor y lo baja como archivo).
  const handleDownloadPDF = async (q) => {
    try {
      await downloadPdf(`/api/quotes/${q.id}/pdf`, `cotizacion-${q.number}.pdf`);
    } catch(e) { notify.error('Error al generar PDF'); }
  };

  useEffect(() => {
    quotesApi.list().then(setQuotes).finally(() => setLoading(false));
  }, []);

  // Filtra la lista de cotizaciones segun lo que el usuario busco (por numero, cliente o equipo).
  const filtered = quotes.filter(q =>
    q.number?.toLowerCase().includes(search.toLowerCase()) ||
    q.client_name?.toLowerCase().includes(search.toLowerCase()) ||
    q.equipment_name?.toLowerCase().includes(search.toLowerCase())
  );

  // Elimina la cotizacion ya confirmada en el dialogo.
  const handleDelete = async () => {
    if (!toDelete) return;
    try {
      await quotesApi.remove(toDelete.id);
      setQuotes(prev => prev.filter(q => q.id !== toDelete.id));
      notify.success('Cotización No. ' + toDelete.number + ' eliminada');
    } catch(e) {
      notify.error(e.response?.data?.error || e.message || 'No se pudo eliminar la cotización');
    } finally {
      setToDelete(null);
    }
  };

  return (
    <div style={{ padding: '20px 16px', maxWidth: 1100, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <FileText size={26} color="var(--c-accent)" />
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Cotizaciones</h1>
            <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>{quotes.length} cotizaciones registradas</p>
          </div>
        </div>
        <button
          onClick={() => navigate('/cotizaciones/nueva')}
          style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#CA8A04', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 18px', fontWeight: 600, cursor: 'pointer', fontSize: 14 }}
        >
          <Plus size={18} /> Nueva Cotización
        </button>
      </div>

      {/* Buscador */}
      <div style={{ position: 'relative', marginBottom: 16 }}>
        <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por No., cliente o equipo..."
          style={{ width: '100%', padding: '10px 12px 10px 36px', borderRadius: 8, border: '1px solid var(--c-line)', background: 'var(--c-surface-2)', color: 'var(--c-text)', fontSize: 14, boxSizing: 'border-box' }}
        />
      </div>

      {/* Lista */}
      {loading ? (
        <p style={{ color: '#64748b', textAlign: 'center', marginTop: 40 }}>Cargando...</p>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', marginTop: 60, color: '#64748b' }}>
          <FileText size={48} style={{ opacity: 0.3, margin: '0 auto 12px' }} />
          <p>No hay cotizaciones registradas</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(q => {
            const st = STATUS_LABELS[q.status] || STATUS_LABELS.borrador;
            return (
              <div key={q.id} style={{ background: 'var(--c-surface)', border: '1px solid var(--c-line)', borderRadius: 12, padding: '14px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                      <span style={{ fontWeight: 700, fontSize: 16, color: '#CA8A04' }}>No. {q.number}</span>
                      <span style={{ background: st.color + '22', color: st.color, border: '1px solid ' + st.color + '44', borderRadius: 20, padding: '2px 10px', fontSize: 12, fontWeight: 600 }}>{st.label}</span>
                    </div>
                    <p style={{ margin: '2px 0', fontSize: 14, fontWeight: 600, color: 'var(--c-text)' }}>{q.client_name || '—'}</p>
                    <p style={{ margin: '2px 0', fontSize: 13, color: '#94a3b8' }}>{q.equipment_name || 'Sin equipo'} {q.brand ? '· ' + q.brand : ''}</p>
                    <p style={{ margin: '4px 0 0', fontSize: 12, color: '#64748b' }}>
                      Fecha: {q.date?.slice(0,10)}
                      {q.valid_until ? ' · Válida hasta: ' + q.valid_until.slice(0,10) : ''}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {q.total > 0 && <span style={{ fontWeight: 700, color: '#10b981', fontSize: 15 }}>Q {Number(q.total).toFixed(2)}</span>}
                    {/* Solo aparece si la cotizacion ya esta "aprobada": abre el formulario de
                        Orden de Trabajo prellenado con los datos de este equipo/cotizacion. */}
                    {q.status === 'aprobada' && (
                      <button onClick={() => navigate('/ordenes/nueva?fromQuote=' + q.id)} title="Crear orden de trabajo desde esta cotización" style={{ background: '#E8551C22', border: '1px solid #E8551C55', borderRadius: 7, padding: '7px 10px', cursor: 'pointer', color: '#E8551C', display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700 }}>
                        <ClipboardList size={15} /> Crear Orden
                      </button>
                    )}
                    <button onClick={() => setFlowSource({ type: 'quote', id: q.id })} title="Mapa de Relaciones" style={{ background: 'var(--c-surface-2)', border: 'none', borderRadius: 7, padding: '7px 10px', cursor: 'pointer', color: '#8b5cf6' }}><Network size={16} /></button>
                    <button onClick={() => setEmailQuote(q)} title="Enviar por correo al cliente" style={{ background: 'var(--c-surface-2)', border: 'none', borderRadius: 7, padding: '7px 10px', cursor: 'pointer', color: '#CA8A04' }}><Mail size={16} /></button>
                    <button onClick={() => setPdfQuote(q)} title="Visualizar PDF" style={{ background: 'var(--c-surface-2)', border: 'none', borderRadius: 7, padding: '7px 10px', cursor: 'pointer', color: '#3b82f6' }}><Eye size={16} /></button>
                    <button onClick={() => handleDownloadPDF(q)} title="Descargar PDF" style={{ background: 'var(--c-surface-2)', border: 'none', borderRadius: 7, padding: '7px 10px', cursor: 'pointer', color: '#10b981' }}><Download size={16} /></button>
                    <button onClick={() => navigate('/cotizaciones/' + q.id + '/editar')} title="Editar cotización" style={{ background: 'var(--c-surface-2)', border: 'none', borderRadius: 7, padding: '7px 10px', cursor: 'pointer', color: '#94a3b8' }}><Pencil size={16} /></button>
                    <button onClick={() => setToDelete(q)} title="Eliminar cotización" style={{ background: 'var(--c-surface-2)', border: 'none', borderRadius: 7, padding: '7px 10px', cursor: 'pointer', color: '#ef4444' }}><Trash2 size={16} /></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <DocumentFlowModal open={flowSource != null} onClose={() => setFlowSource(null)} source={flowSource} />

      {/* Enviar la cotizacion por correo al cliente (con el PDF adjunto, via n8n) */}
      <SendQuoteEmailModal quote={emailQuote} onClose={() => setEmailQuote(null)} />

      {/* Visor del PDF dentro de la app (no abre otra pestaña) */}
      <PdfViewerModal
        open={pdfQuote != null}
        onClose={() => setPdfQuote(null)}
        url={pdfQuote ? `/api/quotes/${pdfQuote.id}/pdf` : null}
        fileName={pdfQuote ? `cotizacion-${pdfQuote.number}.pdf` : ''}
        title={pdfQuote ? `Cotización No. ${pdfQuote.number}` : ''}
      />

      <ConfirmDialog
        open={toDelete != null}
        onClose={() => setToDelete(null)}
        onConfirm={handleDelete}
        title="Eliminar cotización"
        message={toDelete ? `¿Seguro que deseas eliminar la cotización No. ${toDelete.number}? Esta acción no se puede deshacer.` : ''}
        confirmText="Eliminar"
      />
    </div>
  );
}
