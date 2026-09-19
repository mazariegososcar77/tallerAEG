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
// Certificar emite la factura ELECTRÓNICA ante la SAT a través de Digifact (UUID, serie y
// número fiscales), guarda el XML y el PDF oficiales y le manda el PDF al cliente por correo.
// Sin credenciales de Digifact solo cambia el estado interno (uso administrativo, sin validez
// fiscal) y la pantalla lo avisa arriba. En el ambiente de pruebas de Digifact las facturas
// salen marcadas "PRUEBAS": tienen UUID, pero no existen para la SAT.
//   - También: ver el PDF oficial y bajar el XML, reenviar por correo y anular.
// ============================================================================
import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { invoicesApi } from '../../api/invoicesApi.js';
import { clientsApi } from '../../api/clientsApi.js';
import { downloadPdf, downloadXml } from '../../lib/pdf.js';
import { notify } from '../../lib/toast.js';
import { useAuth } from '../../hooks/useAuth.js';
import { useIsMobile } from '../../hooks/useIsMobile.js';
import Combobox from '../../components/ui/Combobox.jsx';
import DatePicker from '../../components/ui/DatePicker.jsx';
import PdfViewerModal from '../../components/ui/PdfViewerModal.jsx';
import Modal from '../../components/ui/Modal.jsx';
import Select from '../../components/ui/Select.jsx';
import Button from '../../components/ui/Button.jsx';
import DocumentFlowModal from '../../components/documentFlow/DocumentFlowModal.jsx';
import { Receipt, Search, Download, Eye, ShieldCheck, Network, FileCheck2, FileCode, Mail, Ban, AlertTriangle } from 'lucide-react';

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
  const [certifyEmail, setCertifyEmail] = useState(''); // a cual contacto del cliente se le va a mandar (o correo escrito a mano)
  const [certifying, setCertifying] = useState(false);
  const [pdfInvoice, setPdfInvoice] = useState(null); // factura que se esta viendo en el visor de PDF
  const [flowSource, setFlowSource] = useState(null); // { type: 'invoice', id } para el Mapa de Relaciones
  const [felStatus, setFelStatus] = useState(null); // { configured, environment } de Digifact
  const [nitCheck, setNitCheck] = useState(null); // resultado de consultar el NIT del cliente en la SAT, al certificar
  const [felPdfInvoice, setFelPdfInvoice] = useState(null); // factura cuyo PDF OFICIAL se esta viendo
  const [cancelInvoice, setCancelInvoice] = useState(null); // factura que se va a anular
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [emailInvoice, setEmailInvoice] = useState(null); // factura cuyo PDF oficial se va a reenviar
  const [emailTo, setEmailTo] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  // Vuelve a traer la lista de facturas desde el servidor (se usa al cargar
  // la pantalla y después de certificar una factura, para refrescar datos).
  const reload = () => invoicesApi.list().then(setInvoices);

  // Al entrar a la pantalla: carga las facturas y la lista de clientes
  // (esta última se usa para el filtro "Cliente").
  useEffect(() => {
    reload().finally(() => setLoading(false));
    clientsApi.list().then(setClients);
    invoicesApi.felStatus().then(setFelStatus).catch(() => setFelStatus(null));
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

  // Abre el paso de confirmacion, proponiendo el primer contacto del cliente
  // (si tiene) como correo por defecto -- se puede elegir otro o escribir uno a mano.
  const openConfirmCertify = (inv) => {
    setConfirmCertify(inv);
    setCertifyEmail(inv.client_contacts?.[0]?.email || '');
    // Antes de emitir ante la SAT, se comprueba que el NIT exista: es lo que mas rechazos causa.
    setNitCheck(null);
    if (inv.client_nit) {
      setNitCheck({ loading: true });
      invoicesApi.lookupNit(inv.client_nit)
        .then((r) => setNitCheck({ ...r, kind: 'nit' }))
        .catch(() => setNitCheck({ error: true }));
    } else {
      setNitCheck({ kind: inv.client_dpi ? 'cui' : 'cf' });
    }
  };

  // Se llama al confirmar "Certificar factura": le pide al servidor que la
  // marque como certificada con el correo elegido (invoicesApi.certify) y
  // refresca la lista.
  const handleCertifyConfirmed = async () => {
    if (!confirmCertify) return;
    setCertifying(true);
    try {
      const r = await invoicesApi.certify(confirmCertify.id, certifyEmail.trim());
      if (r.fel_uuid) {
        notify.success(r.fel_environment === 'test' ? 'Factura certificada en el ambiente de PRUEBAS (sin validez ante la SAT)' : 'Factura certificada ante la SAT');
        if (r.email_result?.sent) notify.success('PDF enviado a ' + r.email_result.email);
        else if (r.email_result?.reason === 'sin_webhook') notify.info('No se envió el correo: falta configurar n8n en Configuración > Notificaciones. Puedes enviarlo después.');
        else if (r.email_result && !r.email_result.sent) notify.info('La factura quedó certificada, pero no se pudo enviar el correo: ' + (r.email_result.reason || ''));
      } else {
        notify.success('Factura certificada (solo administrativa: Digifact no está configurado)');
      }
      setConfirmCertify(null);
      setCertifyInvoice(null);
      reload();
    } catch (e) {
      notify.error(e.response?.data?.message || e.response?.data?.error || 'No se pudo certificar la factura');
    } finally {
      setCertifying(false);
    }
  };

  const handleCancelConfirmed = async () => {
    if (!cancelInvoice) return;
    setCancelling(true);
    try {
      await invoicesApi.cancel(cancelInvoice.id, cancelReason.trim());
      notify.success('Factura anulada');
      setCancelInvoice(null);
      reload();
    } catch (e) {
      notify.error(e.response?.data?.error || e.response?.data?.message || 'No se pudo anular la factura');
    } finally {
      setCancelling(false);
    }
  };

  const handleSendEmail = async () => {
    if (!emailInvoice) return;
    setSendingEmail(true);
    try {
      const r = await invoicesApi.sendEmail(emailInvoice.id, emailTo.trim());
      notify.success('PDF enviado a ' + r.email);
      setEmailInvoice(null);
      reload();
    } catch (e) {
      notify.error(e.response?.data?.error || e.response?.data?.message || 'No se pudo enviar el correo');
    } finally {
      setSendingEmail(false);
    }
  };

  const handleDownloadXml = async (inv) => {
    try {
      await downloadXml(`/api/invoices/${inv.id}/fel-xml`, `factura-${inv.fel_series || ''}${inv.fel_number ? '-' + inv.fel_number : inv.number}.xml`);
    } catch (e) { notify.error('No se pudo descargar el XML'); }
  };

  const iconBtn = { background: 'var(--c-surface-2)', border: 'none', borderRadius: 7, padding: '7px 10px', cursor: 'pointer' };

  return (
    <div style={{ padding: '20px 16px', maxWidth: 1100, margin: '0 auto' }}>
      {felStatus && (!felStatus.configured || felStatus.environment === 'test') && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, background: '#f59e0b18', border: '1px solid #f59e0b55', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: 'var(--c-text)' }}>
          <AlertTriangle size={16} color="#f59e0b" style={{ flexShrink: 0, marginTop: 1 }} />
          <span>
            {felStatus.configured
              ? <><strong>Digifact en modo PRUEBAS.</strong> Las facturas que se certifiquen ahora reciben UUID pero <strong>no tienen validez ante la SAT</strong>.</>
              : <><strong>Digifact no está configurado.</strong> Certificar solo cambia el estado interno: la factura <strong>no es fiscal</strong> (faltan las credenciales en el servidor).</>}
          </span>
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <Receipt size={26} color="#E8551C" />
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Facturación</h1>
          <p style={{ fontSize: 13, color: 'var(--c-muted)', margin: 0 }}>{invoices.length} facturas registradas</p>
        </div>
      </div>

      {/* Filtros: buscar por texto, por cliente, por rango de fechas, o
          mostrar solo las facturas que aún no se han certificado. */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'minmax(0, 1fr) minmax(0, 1fr)' : '1fr 1fr 1fr 1fr auto', gap: 10, marginBottom: 16, alignItems: 'end' }}>
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
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--c-text)', paddingBottom: 9, whiteSpace: 'nowrap', gridColumn: isMobile ? '1 / -1' : 'auto' }}>
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
                      {inv.fel_environment === 'test' && <span title="Certificada en el ambiente de pruebas de Digifact: no existe para la SAT" style={{ background: '#ef444422', color: '#ef4444', border: '1px solid #ef444444', borderRadius: 20, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>PRUEBAS</span>}
                    </div>
                    <p style={{ margin: '2px 0', fontSize: 14, fontWeight: 600, color: 'var(--c-text)' }}>{inv.client_name || '—'}</p>
                    <p style={{ margin: '2px 0', fontSize: 13, color: 'var(--c-muted)' }}>Orden No. {inv.work_order_number} · {inv.date?.slice(0, 10)}</p>
                    {inv.fel_uuid && (
                      <p style={{ margin: '2px 0', fontSize: 11, color: 'var(--c-muted)', overflowWrap: 'anywhere' }}>
                        DTE {[inv.fel_series, inv.fel_number].filter(Boolean).join('-')} · {inv.fel_uuid}
                        {inv.email_sent_at ? ' · enviada por correo' : ''}
                      </p>
                    )}
                    {inv.status === 'anulada' && inv.cancel_reason && <p style={{ margin: '2px 0', fontSize: 11, color: '#ef4444' }}>Motivo: {inv.cancel_reason}</p>}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, color: '#10b981', fontSize: 15 }}>Q {Number(inv.total).toFixed(2)}</span>
                    <button onClick={() => setFlowSource({ type: 'invoice', id: inv.id })} title="Mapa de Relaciones" style={{ background: 'var(--c-surface-2)', border: 'none', borderRadius: 7, padding: '7px 10px', cursor: 'pointer', color: '#8b5cf6' }}><Network size={16} /></button>
                    <button onClick={() => setPdfInvoice(inv)} title="Visualizar PDF" style={{ background: 'var(--c-surface-2)', border: 'none', borderRadius: 7, padding: '7px 10px', cursor: 'pointer', color: '#3b82f6' }}><Eye size={16} /></button>
                    <button onClick={() => handleDownloadPDF(inv)} title="Descargar PDF" style={{ background: 'var(--c-surface-2)', border: 'none', borderRadius: 7, padding: '7px 10px', cursor: 'pointer', color: '#10b981' }}><Download size={16} /></button>
                    {inv.fel_uuid && (
                      <button onClick={() => setFelPdfInvoice(inv)} title="Ver el PDF oficial (el que emite Digifact)" style={{ ...iconBtn, color: '#0ea5e9' }}><FileCheck2 size={16} /></button>
                    )}
                    {inv.fel_uuid && (
                      <button onClick={() => handleDownloadXml(inv)} title="Descargar el XML certificado" style={{ ...iconBtn, color: '#8b5cf6' }}><FileCode size={16} /></button>
                    )}
                    {inv.status === 'certificada' && inv.fel_uuid && hasPermission('billing.certify') && (
                      <button onClick={() => { setEmailInvoice(inv); setEmailTo(inv.client_email || inv.client_contacts?.[0]?.email || ''); }} title="Enviar el PDF oficial por correo" style={{ ...iconBtn, color: '#f59e0b' }}><Mail size={16} /></button>
                    )}
                    {inv.status === 'certificada' && hasPermission('billing.cancel') && (
                      <button onClick={() => { setCancelInvoice(inv); setCancelReason(''); }} title="Anular factura" style={{ ...iconBtn, background: '#ef444415', color: '#ef4444' }}><Ban size={16} /></button>
                    )}
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

      {/* PDF oficial de la factura certificada (el que emite Digifact, con el QR de la SAT) */}
      <PdfViewerModal
        open={felPdfInvoice != null}
        onClose={() => setFelPdfInvoice(null)}
        url={felPdfInvoice ? `/api/invoices/${felPdfInvoice.id}/fel-pdf` : null}
        fileName={felPdfInvoice ? `factura-${felPdfInvoice.fel_series || ''}-${felPdfInvoice.fel_number || felPdfInvoice.number}.pdf` : ''}
        title={felPdfInvoice ? `Factura oficial ${[felPdfInvoice.fel_series, felPdfInvoice.fel_number].filter(Boolean).join('-')}` : ''}
      />

      {/* Anular una factura certificada */}
      <Modal
        open={cancelInvoice != null}
        onClose={cancelling ? undefined : () => setCancelInvoice(null)}
        title="Anular factura"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setCancelInvoice(null)} disabled={cancelling}>Cancelar</Button>
            <Button variant="primary" onClick={handleCancelConfirmed} loading={cancelling} disabled={cancelReason.trim().length < 5}>Anular</Button>
          </>
        }
      >
        {cancelInvoice && (
          <div className="space-y-3">
            <p className="text-sm text-slate-600">
              Se anulará la factura {[cancelInvoice.fel_series, cancelInvoice.fel_number].filter(Boolean).join('-') || cancelInvoice.number} de {cancelInvoice.client_name || 'este cliente'} por Q {Number(cancelInvoice.total).toFixed(2)}
              {cancelInvoice.fel_uuid ? ' también ante la SAT.' : '.'} <strong>Esto no se puede deshacer.</strong>
            </p>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              rows={3}
              placeholder="Motivo de la anulación (obligatorio)"
              style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--c-line)', background: 'var(--c-surface-2)', color: 'var(--c-text)', fontSize: 13, boxSizing: 'border-box', resize: 'vertical' }}
            />
          </div>
        )}
      </Modal>

      {/* Reenviar el PDF oficial por correo */}
      <Modal
        open={emailInvoice != null}
        onClose={sendingEmail ? undefined : () => setEmailInvoice(null)}
        title="Enviar factura por correo"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setEmailInvoice(null)} disabled={sendingEmail}>Cancelar</Button>
            <Button variant="primary" onClick={handleSendEmail} loading={sendingEmail} disabled={!emailTo.trim()}>Enviar</Button>
          </>
        }
      >
        {emailInvoice && (
          <div className="space-y-3">
            <p className="text-sm text-slate-600">Se enviará el PDF oficial de la factura {[emailInvoice.fel_series, emailInvoice.fel_number].filter(Boolean).join('-')}.</p>
            {emailInvoice.client_contacts?.length > 0 && (
              <Select
                label="Contacto del cliente"
                value={emailTo}
                onChange={setEmailTo}
                options={emailInvoice.client_contacts.map((c) => ({ value: c.email, label: c.name ? `${c.email} — ${c.name}` : c.email }))}
                placeholder="Elegir un contacto..."
              />
            )}
            <input
              type="email"
              value={emailTo}
              onChange={(e) => setEmailTo(e.target.value)}
              placeholder="correo@ejemplo.com"
              style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--c-line)', background: 'var(--c-surface-2)', color: 'var(--c-text)', fontSize: 13, boxSizing: 'border-box' }}
            />
          </div>
        )}
      </Modal>

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
            ? { icon: ShieldCheck, label: 'Certificar', onClick: () => openConfirmCertify(certifyInvoice) }
            : null
        }
      />

      {/* Confirmar certificacion: elige a cual contacto del cliente se le manda
          (o se escribe un correo a mano si no hay ninguno guardado). */}
      <Modal
        open={confirmCertify != null}
        onClose={certifying ? undefined : () => setConfirmCertify(null)}
        title="Certificar factura"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setConfirmCertify(null)} disabled={certifying}>Cancelar</Button>
            <Button variant="primary" onClick={handleCertifyConfirmed} loading={certifying}>Confirmar</Button>
          </>
        }
      >
        {confirmCertify && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              ¿Está seguro de certificar la factura de {confirmCertify.client_name || 'este cliente'}, por Q {Number(confirmCertify.total).toFixed(2)}, con fecha {confirmCertify.date?.slice(0, 10)}?
            </p>
            {nitCheck && (
              <div style={{ fontSize: 12, borderRadius: 8, padding: '8px 10px', background: nitCheck.found === false && nitCheck.configured ? '#ef444415' : 'var(--c-surface-2)', border: '1px solid ' + (nitCheck.found === false && nitCheck.configured ? '#ef444455' : 'var(--c-line)'), color: 'var(--c-text)' }}>
                {nitCheck.loading && 'Verificando el NIT en la SAT…'}
                {nitCheck.error && 'No se pudo verificar el NIT en la SAT (se intentará certificar de todos modos).'}
                {nitCheck.kind === 'cf' && <>Se facturará a <strong>Consumidor Final (CF)</strong>: el cliente no tiene NIT ni DPI.</>}
                {nitCheck.kind === 'cui' && <>Se facturará con el <strong>DPI (CUI)</strong> del cliente: no tiene NIT.</>}
                {nitCheck.kind === 'nit' && nitCheck.configured === false && 'Digifact no está configurado: no se puede verificar el NIT.'}
                {nitCheck.kind === 'nit' && nitCheck.configured && nitCheck.found && <>NIT <strong>{confirmCertify.client_nit}</strong> verificado en la SAT: {nitCheck.name}</>}
                {nitCheck.kind === 'nit' && nitCheck.configured && nitCheck.found === false && <><strong>El NIT {confirmCertify.client_nit} no existe en la SAT.</strong> Corrígelo en la ficha del cliente antes de certificar, o Digifact rechazará la factura.</>}
              </div>
            )}
            {confirmCertify.client_contacts?.length > 0 && (
              <Select
                label="Contacto del cliente"
                value={certifyEmail}
                onChange={setCertifyEmail}
                options={confirmCertify.client_contacts.map((c) => ({ value: c.email, label: c.name ? `${c.email} — ${c.name}` : c.email }))}
                placeholder="Elegir un contacto..."
              />
            )}
            <input
              type="email"
              value={certifyEmail}
              onChange={(e) => setCertifyEmail(e.target.value)}
              placeholder="correo@ejemplo.com"
              style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--c-line)', background: 'var(--c-surface-2)', color: 'var(--c-text)', fontSize: 13, boxSizing: 'border-box' }}
            />
            {!confirmCertify.client_contacts?.length && (
              <p className="-mt-2 text-[11px] text-muted">Este cliente no tiene contactos guardados en su ficha, así que hay que escribirlo.</p>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
