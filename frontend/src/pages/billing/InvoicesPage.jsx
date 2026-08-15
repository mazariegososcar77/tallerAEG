// ============================================================================
// PANTALLA: Facturación
// Se accede desde el menú "Facturación" (/facturacion). Muestra la lista de
// todas las facturas generadas por el sistema (se crean automáticamente al
// finalizar un Reporte de Trabajo). Desde aquí se puede:
//   - Buscar y filtrar facturas por cliente, rango de fechas o "solo
//     pendientes de certificar".
//   - Ver una vista previa del PDF (en una ventana dentro de la app) o descargarlo.
//   - Certificar una factura pendiente: se abre el PDF con un boton flotante
//     "Certificar" encima, y al confirmar en un dialogo simple se certifica.
// La certificación fiscal (FEL) real todavía no está integrada; certificar
// aquí solo cambia el estado interno de la factura.
// ============================================================================
import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { invoicesApi } from '../../api/invoicesApi.js';
import { clientsApi } from '../../api/clientsApi.js';
import { downloadPdf } from '../../lib/pdf.js';
import { notify } from '../../lib/toast.js';
import { useAuth } from '../../hooks/useAuth.js';
import { useIsMobile } from '../../hooks/useIsMobile.js';
import Combobox from '../../components/ui/Combobox.jsx';
import DatePicker from '../../components/ui/DatePicker.jsx';
import PdfViewerModal from '../../components/ui/PdfViewerModal.jsx';
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx';
import DocumentFlowModal from '../../components/documentFlow/DocumentFlowModal.jsx';
import { Receipt, Search, Download, Eye, ShieldCheck, Network } from 'lucide-react';

const STATUS_LABELS = {
  pendiente_certificacion: { label: 'Pendiente de Certificar', color: '#f59e0b' },
  certificada:             { label: 'Certificada',             color: '#10b981' },
  anulada:                 { label: 'Anulada',                 color: '#ef4444' },
};

export default function InvoicesPage() {
  const isMobile = useIsMobile();
  const { hasPermission } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState('');
  const [clientId, setClientId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [onlyPending, setOnlyPending] = useState(true);
  const [loading, setLoading] = useState(true);
  const [certifyInvoice, setCertifyInvoice] = useState(null); // factura pendiente que se ve en el visor con el boton flotante "Certificar"
  const [confirmCertify, setConfirmCertify] = useState(null); // factura para la que se esta confirmando la certificacion
  const [pdfInvoice, setPdfInvoice] = useState(null); // factura que se esta viendo en el visor de PDF
  const [flowSource, setFlowSource] = useState(null); // { type: 'invoice', id } para el Mapa de Relaciones
  const [searchParams, setSearchParams] = useSearchParams();

  // Vuelve a traer la lista de facturas desde el servidor (se usa al cargar
  // la pantalla y después de certificar una factura, para refrescar datos).
  const reload = () => invoicesApi.list().then(setInvoices);

  // Al entrar a la pantalla: carga las facturas y la lista de clientes
  // (esta última se usa para el filtro "Cliente").
  useEffect(() => {
    reload().finally(() => setLoading(false));
    clientsApi.list().then(setClients);
  }, []);

  // Si se llega a esta pantalla con un enlace tipo "?invoice=123" (por
  // ejemplo, al terminar un Reporte de Trabajo que acaba de generar esa
  // factura), se abre automáticamente el PDF con el boton de certificar para
  // esa factura en particular.
  useEffect(() => {
    const invoiceId = searchParams.get('invoice');
    if (invoiceId && invoices.length) {
      const found = invoices.find(i => String(i.id) === invoiceId);
      if (found && found.status === 'pendiente_certificacion') setCertifyInvoice(found);
      setSearchParams({}, { replace: true });
    }
  }, [invoices, searchParams, setSearchParams]);

  // Aplica los filtros de la pantalla (solo pendientes, cliente, fechas y
  // texto de búsqueda) sobre la lista completa de facturas ya cargada.
  const filtered = invoices.filter(inv => {
    if (onlyPending && inv.status !== 'pendiente_certificacion') return false;
    if (clientId && String(inv.client_id) !== String(clientId)) return false;
    if (dateFrom && inv.date?.slice(0, 10) < dateFrom) return false;
    if (dateTo && inv.date?.slice(0, 10) > dateTo) return false;
    if (search && !(
      inv.number?.toLowerCase().includes(search.toLowerCase()) ||
      inv.client_name?.toLowerCase().includes(search.toLowerCase()) ||
      inv.work_order_number?.toLowerCase().includes(search.toLowerCase())
    )) return false;
    return true;
  });

  // Descarga el PDF de la factura al dispositivo del usuario.
  const handleDownloadPDF = async (inv) => {
    try {
      await downloadPdf(`/api/invoices/${inv.id}/pdf`, `factura-${inv.number}.pdf`);
    } catch (e) { notify.error('Error al generar PDF'); }
  };

  // Se llama al confirmar el dialogo "¿Está seguro de certificar...?": le
  // pide al servidor que marque la factura como certificada (misma accion de
  // siempre, invoicesApi.certify) y refresca la lista. El correo ya no se
  // pide en este flujo: se usa el que ya tiene el cliente registrado.
  const handleCertifyConfirmed = async () => {
    if (!confirmCertify) return;
    await invoicesApi.certify(confirmCertify.id, confirmCertify.client_default_email || '');
    notify.success('Factura certificada');
    setConfirmCertify(null);
    setCertifyInvoice(null);
    reload();
  };

  return (
    <div style={{ padding: '20px 16px', maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <Receipt size={26} color="#E8551C" />
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Facturación</h1>
          <p style={{ fontSize: 13, color: 'var(--c-muted)', margin: 0 }}>{invoices.length} facturas registradas</p>
        </div>
      </div>

      {/* Filtros: buscar por texto, por cliente, por rango de fechas, o
          mostrar solo las facturas que aún no se han certificado. */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr 1fr 1fr 1fr auto', gap: 10, marginBottom: 16, alignItems: 'end' }}>
        <div style={{ position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: 34, color: 'var(--c-muted)' }} />
          <label style={{ display: 'block', fontSize: 10, fontWeight: 800, color: 'var(--c-muted)', textTransform: 'uppercase', marginBottom: 5 }}>Buscar</label>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="No., orden o cliente..."
            style={{ width: '100%', padding: '9px 12px 9px 36px', borderRadius: 8, border: '1px solid var(--c-line)', background: 'var(--c-surface-2)', color: 'var(--c-text)', fontSize: 13, boxSizing: 'border-box' }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 10, fontWeight: 800, color: 'var(--c-muted)', textTransform: 'uppercase', marginBottom: 5 }}>Cliente</label>
          <Combobox
            value={clientId}
            onChange={setClientId}
            options={[{ value: '', label: 'Todos los clientes' }, ...clients.map(c => ({ value: c.id, label: c.full_name || c.first_name }))]}
            searchable
          />
        </div>
        <DatePicker label="Desde" value={dateFrom} onChange={setDateFrom} />
        <DatePicker label="Hasta" value={dateTo} onChange={setDateTo} />
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--c-text)', paddingBottom: 9, whiteSpace: 'nowrap' }}>
          <input type="checkbox" checked={onlyPending} onChange={e => setOnlyPending(e.target.checked)} />
          Solo pendientes
        </label>
      </div>

      {loading ? (
        <p style={{ color: 'var(--c-muted)', textAlign: 'center', marginTop: 40 }}>Cargando...</p>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', marginTop: 60, color: 'var(--c-muted)' }}>
          <Receipt size={48} style={{ opacity: 0.3, margin: '0 auto 12px' }} />
          <p>No hay facturas que coincidan con el filtro</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(inv => {
            const st = STATUS_LABELS[inv.status] || STATUS_LABELS.pendiente_certificacion;
            return (
              <div key={inv.id} style={{ background: 'var(--c-surface)', border: '1px solid var(--c-line)', borderRadius: 12, padding: '14px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                      <span style={{ fontWeight: 700, fontSize: 16, color: '#E8551C' }}>Factura No. {inv.number}</span>
                      <span style={{ background: st.color + '22', color: st.color, border: '1px solid ' + st.color + '44', borderRadius: 20, padding: '2px 10px', fontSize: 12, fontWeight: 600 }}>{st.label}</span>
                    </div>
                    <p style={{ margin: '2px 0', fontSize: 14, fontWeight: 600, color: 'var(--c-text)' }}>{inv.client_name || '—'}</p>
                    <p style={{ margin: '2px 0', fontSize: 13, color: 'var(--c-muted)' }}>Orden No. {inv.work_order_number} · {inv.date?.slice(0, 10)}</p>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, color: '#10b981', fontSize: 15 }}>Q {Number(inv.total).toFixed(2)}</span>
                    <button onClick={() => setFlowSource({ type: 'invoice', id: inv.id })} title="Mapa de Relaciones" style={{ background: 'var(--c-surface-2)', border: 'none', borderRadius: 7, padding: '7px 10px', cursor: 'pointer', color: '#8b5cf6' }}><Network size={16} /></button>
                    <button onClick={() => setPdfInvoice(inv)} title="Visualizar PDF" style={{ background: 'var(--c-surface-2)', border: 'none', borderRadius: 7, padding: '7px 10px', cursor: 'pointer', color: '#3b82f6' }}><Eye size={16} /></button>
                    <button onClick={() => handleDownloadPDF(inv)} title="Descargar PDF" style={{ background: 'var(--c-surface-2)', border: 'none', borderRadius: 7, padding: '7px 10px', cursor: 'pointer', color: '#10b981' }}><Download size={16} /></button>
                    {inv.status === 'pendiente_certificacion' && hasPermission('billing.certify') && (
                      <button onClick={() => setCertifyInvoice(inv)} title="Certificar factura" style={{ background: '#E8551C', border: 'none', borderRadius: 7, padding: '7px 12px', cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700 }}>
                        <ShieldCheck size={15} /> Certificar
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <DocumentFlowModal open={flowSource != null} onClose={() => setFlowSource(null)} source={flowSource} />

      {/* Visor del PDF dentro de la app (no abre otra pestaña) */}
      <PdfViewerModal
        open={pdfInvoice != null}
        onClose={() => setPdfInvoice(null)}
        url={pdfInvoice ? `/api/invoices/${pdfInvoice.id}/pdf` : null}
        fileName={pdfInvoice ? `factura-${pdfInvoice.number}.pdf` : ''}
        title={pdfInvoice ? `Factura No. ${pdfInvoice.number}` : ''}
      />

      {/* Certificar: muestra el PDF de la factura con un boton flotante
          "Certificar" encima (solo si sigue pendiente de certificar). */}
      <PdfViewerModal
        open={certifyInvoice != null}
        onClose={() => setCertifyInvoice(null)}
        url={certifyInvoice ? `/api/invoices/${certifyInvoice.id}/pdf` : null}
        fileName={certifyInvoice ? `factura-${certifyInvoice.number}.pdf` : ''}
        title={certifyInvoice ? `Factura No. ${certifyInvoice.number}` : ''}
        floatingAction={
          certifyInvoice && certifyInvoice.status === 'pendiente_certificacion'
            ? { icon: ShieldCheck, label: 'Certificar', onClick: () => setConfirmCertify(certifyInvoice) }
            : null
        }
      />

      <ConfirmDialog
        open={confirmCertify != null}
        onClose={() => setConfirmCertify(null)}
        onConfirm={handleCertifyConfirmed}
        title="Certificar factura"
        confirmText="Confirmar"
        variant="primary"
        message={confirmCertify ? `¿Está seguro de certificar la factura de ${confirmCertify.client_name || 'este cliente'}, por Q ${Number(confirmCertify.total).toFixed(2)}, con fecha ${confirmCertify.date?.slice(0, 10)}?` : ''}
      />
    </div>
  );
}
