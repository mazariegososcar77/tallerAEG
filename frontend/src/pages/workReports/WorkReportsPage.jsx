// PANTALLA: Lista de Reportes de Trabajo. Muestra todos los reportes fotográficos
// hechos, con su número, cliente, la orden de trabajo a la que pertenecen y su
// estado ("En Progreso" o "Finalizado"). No hay botón para crear un reporte
// nuevo aquí — los reportes se crean desde el botón de cámara en la pantalla de
// Órdenes de Trabajo. Desde aquí se puede buscar, ver una vista previa del PDF,
// descargarlo o abrir el reporte para verlo/seguir editándolo.
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { workReportsApi } from '../../api/workReportsApi.js';
import { downloadPdf } from '../../lib/pdf.js';
import { notify } from '../../lib/toast.js';
import PdfViewerModal from '../../components/ui/PdfViewerModal.jsx';
import DocumentFlowModal from '../../components/documentFlow/DocumentFlowModal.jsx';
import Modal from '../../components/ui/Modal.jsx';
import { Camera, Search, Pencil, Eye, Download, Network, Share2 } from 'lucide-react';

const STATUS_LABELS = {
  en_progreso: { label: 'En Progreso', color: '#f59e0b' },
  finalizado:  { label: 'Finalizado',  color: '#10b981' },
};

export default function WorkReportsPage({ flowType = 'pre' }) {
  const isPost = flowType === 'post';
  const [reports, setReports] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [pdfReport, setPdfReport] = useState(null); // reporte que se esta viendo en el visor de PDF
  const [flowSource, setFlowSource] = useState(null); // { type: 'work_report', id } para el Mapa de Relaciones
  const [shareReport, setShareReport] = useState(null); // reporte para el que se esta generando el enlace de solo lectura
  const [shareLink, setShareLink] = useState('');
  const [loadingShare, setLoadingShare] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    workReportsApi.list().then(setReports).finally(() => setLoading(false));
  }, []);

  // Separa los reportes por flujo, igual que WorkOrdersPage con las ordenes: cada
  // pantalla muestra solo los suyos. Los reportes de Orden de Servicio no pertenecen a
  // ningun flujo (flow_type viene null), y por eso caen del lado "Pre" -- que es donde
  // se venian viendo -- en vez de quedarse sin pantalla que los liste.
  const flowReports = reports.filter(r => (r.flow_type || 'pre') === flowType);

  // Filtra la lista segun lo que el usuario busco (por numero de reporte, orden o cliente).
  const filtered = flowReports.filter(r =>
    r.number?.toLowerCase().includes(search.toLowerCase()) ||
    r.client_name?.toLowerCase().includes(search.toLowerCase()) ||
    r.work_order_number?.toLowerCase().includes(search.toLowerCase())
  );

  // Descarga el PDF del reporte al dispositivo.
  const handleDownloadPDF = async (report) => {
    try {
      await downloadPdf(`/api/work-reports/${report.id}/pdf`, `reporte-${report.number}.pdf`);
    } catch (e) { notify.error('Error al generar PDF'); }
  };

  // Genera (o recupera) el enlace publico de SOLO LECTURA para compartirselo al
  // cliente: ve fotos, videos, notas y firmas desde su propio telefono, sin
  // sesion y sin poder modificar nada (ver PublicReportViewPage.jsx).
  const handleShare = async (report) => {
    setShareReport(report);
    setShareLink('');
    setLoadingShare(true);
    try {
      const { token } = await workReportsApi.getShareLink(report.id);
      setShareLink(`${window.location.origin}/ver-reporte/${token}`);
    } catch (e) {
      notify.error(e.message || 'No se pudo generar el enlace');
      setShareReport(null);
    } finally {
      setLoadingShare(false);
    }
  };

  return (
    <div style={{ padding: '20px 16px', maxWidth: 1100, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Camera size={26} color="#E8551C" />
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Reportes de Trabajo{isPost ? ' (Post)' : ''}</h1>
            <p style={{ fontSize: 13, color: 'var(--c-muted)', margin: 0 }}>{flowReports.length} reportes registrados</p>
          </div>
        </div>
      </div>

      {/* Buscador */}
      <div style={{ position: 'relative', marginBottom: 16 }}>
        <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--c-muted)' }} />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por No. de reporte, orden o cliente..."
          style={{ width: '100%', padding: '10px 12px 10px 36px', borderRadius: 8, border: '1px solid var(--c-line)', background: 'var(--c-surface-2)', color: 'var(--c-text)', fontSize: 14, boxSizing: 'border-box' }}
        />
      </div>

      {/* Lista */}
      {loading ? (
        <p style={{ color: 'var(--c-muted)', textAlign: 'center', marginTop: 40 }}>Cargando...</p>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', marginTop: 60, color: 'var(--c-muted)' }}>
          <Camera size={48} style={{ opacity: 0.3, margin: '0 auto 12px' }} />
          <p>No hay reportes registrados</p>
          <p style={{ fontSize: 12 }}>Los reportes se crean desde una Orden de Trabajo.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(report => {
            const st = STATUS_LABELS[report.status] || STATUS_LABELS.en_progreso;
            return (
              <div key={report.id} style={{ background: 'var(--c-surface)', border: '1px solid var(--c-line)', borderRadius: 12, padding: '14px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                      <span style={{ fontWeight: 700, fontSize: 16, color: '#E8551C' }}>Reporte No. {report.number}</span>
                      <span style={{ background: st.color + '22', color: st.color, border: '1px solid ' + st.color + '44', borderRadius: 20, padding: '2px 10px', fontSize: 12, fontWeight: 600 }}>{st.label}</span>
                    </div>
                    <p style={{ margin: '2px 0', fontSize: 14, fontWeight: 600, color: 'var(--c-text)' }}>{report.client_name || '—'}</p>
                    <p style={{ margin: '2px 0', fontSize: 13, color: 'var(--c-muted)' }}>Orden No. {report.work_order_number}</p>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                    {/* Solo tiene sentido para reportes de Orden de Trabajo: los de Orden de
                        Servicio no tienen cotizacion ni factura detras (nunca facturan). */}
                    {report.order_kind === 'work_order' && (
                      <button onClick={() => setFlowSource({ type: 'work_report', id: report.id })} title="Mapa de Relaciones" style={{ background: 'var(--c-surface-2)', border: 'none', borderRadius: 7, padding: '7px 10px', cursor: 'pointer', color: '#8b5cf6' }}><Network size={16} /></button>
                    )}
                    <button onClick={() => setPdfReport(report)} title="Visualizar PDF" style={{ background: 'var(--c-surface-2)', border: 'none', borderRadius: 7, padding: '7px 10px', cursor: 'pointer', color: '#3b82f6' }}><Eye size={16} /></button>
                    <button onClick={() => handleDownloadPDF(report)} title="Descargar PDF" style={{ background: 'var(--c-surface-2)', border: 'none', borderRadius: 7, padding: '7px 10px', cursor: 'pointer', color: '#10b981' }}><Download size={16} /></button>
                    <button onClick={() => handleShare(report)} title="Compartir con el cliente (solo lectura)" style={{ background: 'var(--c-surface-2)', border: 'none', borderRadius: 7, padding: '7px 10px', cursor: 'pointer', color: '#CA8A04' }}><Share2 size={16} /></button>
                    <button onClick={() => navigate('/reportes/' + report.id + '/editar')} title="Ver / Editar reporte" style={{ background: 'var(--c-surface-2)', border: 'none', borderRadius: 7, padding: '7px 10px', cursor: 'pointer', color: '#94a3b8' }}><Pencil size={16} /></button>
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
        open={pdfReport != null}
        onClose={() => setPdfReport(null)}
        url={pdfReport ? `/api/work-reports/${pdfReport.id}/pdf` : null}
        fileName={pdfReport ? `reporte-${pdfReport.number}.pdf` : ''}
        title={pdfReport ? `Reporte No. ${pdfReport.number}` : ''}
      />

      {/* Enlace de solo lectura para compartir con el cliente (sin sesion, no se
          puede modificar nada -- ver PublicReportViewPage.jsx). */}
      <Modal
        open={shareReport != null}
        onClose={() => setShareReport(null)}
        title={shareReport ? `Compartir Reporte No. ${shareReport.number}` : ''}
        accentColor="#CA8A04"
      >
        {loadingShare ? (
          <p style={{ color: 'var(--c-muted)', fontSize: 13 }}>Generando enlace...</p>
        ) : (
          <div>
            <p style={{ fontSize: 13, color: 'var(--c-muted)', margin: '0 0 12px' }}>
              Comparte este enlace con el cliente: lo abre en su celular sin necesitar cuenta en el sistema
              y ve las fotos, videos, notas y firmas del reporte. No puede modificar nada.
            </p>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <input
                readOnly
                value={shareLink}
                onFocus={e => e.target.select()}
                style={{ flex: 1, minWidth: 200, padding: '8px 10px', borderRadius: 6, border: '1px solid var(--c-line)', background: 'var(--c-surface-2)', color: 'var(--c-text)', fontSize: 12 }}
              />
              <button
                type="button"
                onClick={() => { navigator.clipboard.writeText(shareLink); notify.success('Enlace copiado'); }}
                style={{ background: 'var(--c-surface-2)', border: '1px solid var(--c-line)', color: 'var(--c-text)', padding: '0 14px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
              >
                Copiar
              </button>
              <a
                href={`https://wa.me/?text=${encodeURIComponent('Aquí puedes ver tu reporte de trabajo: ' + shareLink)}`}
                target="_blank" rel="noreferrer"
                style={{ background: '#25D366', border: 'none', color: '#fff', padding: '0 14px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', textDecoration: 'none' }}
              >
                Enviar por WhatsApp
              </a>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
