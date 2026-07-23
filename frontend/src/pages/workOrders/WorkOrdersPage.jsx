// PANTALLA: Lista de Órdenes de Trabajo. Muestra todas las órdenes con su
// número, cliente, equipo, estado y fechas de recibido/entrega (sin precios, a
// propósito). Desde aquí se puede buscar, crear una orden nueva, ver el
// detalle, descargar el PDF, editarla, eliminarla, o abrir/crear el Reporte de
// Trabajo fotográfico de esa orden con el icono de cámara.
//
// Esta misma pantalla se reusa para el flujo "Post" (prop flowType="post",
// ver rutas /post/ordenes en AppRoutes.jsx): solo cambia qué órdenes se listan
// (filtro por flow_type) y a qué rutas navegan los botones de crear/editar.
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { workOrdersApi } from '../../api/workOrdersApi.js';
import { workReportsApi } from '../../api/workReportsApi.js';
import { invoicesApi } from '../../api/invoicesApi.js';
import { getToken } from '../../lib/authStorage.js';
import { notify } from '../../lib/toast.js';
import { useAuth } from '../../hooks/useAuth.js';
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx';
import WorkOrderViewModal from './WorkOrderViewModal.jsx';
import { ClipboardList, Plus, Search, Eye, Download, Pencil, Trash2, Camera, FileText, Receipt } from 'lucide-react';

const STATUS_LABELS = {
  recibido:   { label: 'Recibido',   color: '#3b82f6' },
  en_proceso: { label: 'En Proceso', color: '#f59e0b' },
  listo:      { label: 'Listo',      color: '#10b981' },
  entregado:  { label: 'Entregado',  color: '#6366f1' },
  cancelado:  { label: 'Cancelado',  color: '#ef4444' },
};

export default function WorkOrdersPage({ flowType = 'pre' }) {
  const isPost = flowType === 'post';
  const basePath = isPost ? '/post/ordenes' : '/ordenes';
  const { hasPermission } = useAuth();
  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [viewId, setViewId] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const [creatingReportId, setCreatingReportId] = useState(null);
  const [generatingInvoiceId, setGeneratingInvoiceId] = useState(null);
  const navigate = useNavigate();

  // Abre el Reporte de Trabajo (fotos + notas) de esta orden. Si la orden todavia
  // no tiene reporte, lo crea automaticamente (una orden solo puede tener un
  // reporte, asi que si ya existe simplemente lo abre).
  const handleOpenReport = async (order) => {
    setCreatingReportId(order.id);
    try {
      const report = await workReportsApi.createForOrder(order.id);
      navigate('/reportes/' + report.id + '/editar');
    } catch (e) {
      notify.error(e.message || 'No se pudo abrir el reporte');
    } finally {
      setCreatingReportId(null);
    }
  };

  // Flujo Post, boton "Generar Factura": la cotizacion ya esta aprobada (se armo
  // despues del reporte, con el diagnostico real), asi que ya se puede facturar
  // a mano (en Pre esto es automatico al finalizar el reporte, ver
  // workReportService.finalize / WorkReportFormPage).
  const handleGenerateInvoice = async (order) => {
    setGeneratingInvoiceId(order.id);
    try {
      const invoice = await invoicesApi.createFromWorkOrder(order.id);
      navigate('/facturacion?invoice=' + invoice.id);
    } catch (e) {
      notify.error(e.response?.data?.error || e.message || 'No se pudo generar la factura');
    } finally {
      setGeneratingInvoiceId(null);
    }
  };

  useEffect(() => {
    workOrdersApi.list().then(setOrders).finally(() => setLoading(false));
  }, []);

  // Ordenes de este flujo (Pre/Post). Las creadas antes de que existiera este
  // campo quedaron en 'pre' por default, asi que Pre sigue mostrando
  // exactamente lo mismo que mostraba antes de este cambio.
  const flowOrders = orders.filter(o => (o.flow_type || 'pre') === flowType);

  // Ademas, filtra segun lo que el usuario busco (por numero, cliente o equipo).
  const filtered = flowOrders.filter(o =>
    o.number?.toLowerCase().includes(search.toLowerCase()) ||
    o.client_name?.toLowerCase().includes(search.toLowerCase()) ||
    o.equipment_name?.toLowerCase().includes(search.toLowerCase())
  );

  // Descarga el PDF de la orden.
  const handleDownloadPDF = async (order) => {
    try {
      const token = getToken();
      const res = await fetch('/api/work-orders/' + order.id + '/pdf', {
        headers: { Authorization: 'Bearer ' + token }
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'orden-' + order.number + '.pdf';
      a.click();
      URL.revokeObjectURL(url);
    } catch(e) { notify.error('Error al generar PDF'); }
  };

  // Elimina la orden seleccionada, despues de confirmar en el dialogo.
  const handleDelete = async () => {
    if (!toDelete) return;
    try {
      await workOrdersApi.remove(toDelete.id);
      setOrders(prev => prev.filter(o => o.id !== toDelete.id));
      notify.success('Orden No. ' + toDelete.number + ' eliminada');
    } catch(e) {
      notify.error('No se pudo eliminar la orden');
    } finally {
      setToDelete(null);
    }
  };

  return (
    <div style={{ padding: '20px 16px', maxWidth: 1100, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <ClipboardList size={26} color="#f97316" />
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Ordenes de Trabajo{isPost ? ' (Post)' : ''}</h1>
            <p style={{ fontSize: 13, color: 'var(--c-muted)', margin: 0 }}>{flowOrders.length} ordenes registradas</p>
          </div>
        </div>
        <button
          onClick={() => navigate(basePath + '/nueva')}
          title="Crear una nueva orden de trabajo"
          style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f97316', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 18px', fontWeight: 600, cursor: 'pointer', fontSize: 14 }}
        >
          <Plus size={18} /> Nueva Orden
        </button>
      </div>

      {/* Buscador */}
      <div style={{ position: 'relative', marginBottom: 16 }}>
        <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--c-muted)' }} />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por No., cliente o equipo..."
          style={{ width: '100%', padding: '10px 12px 10px 36px', borderRadius: 8, border: '1px solid var(--c-line)', background: 'var(--c-surface-2)', color: 'var(--c-text)', fontSize: 14, boxSizing: 'border-box' }}
        />
      </div>

      {/* Lista */}
      {loading ? (
        <p style={{ color: 'var(--c-muted)', textAlign: 'center', marginTop: 40 }}>Cargando...</p>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', marginTop: 60, color: 'var(--c-muted)' }}>
          <ClipboardList size={48} style={{ opacity: 0.3, margin: '0 auto 12px' }} />
          <p>No hay ordenes registradas</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(order => {
            const st = STATUS_LABELS[order.status] || STATUS_LABELS.recibido;
            return (
              <div key={order.id} style={{ background: 'var(--c-surface)', border: '1px solid var(--c-line)', borderRadius: 12, padding: '14px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                      <span style={{ fontWeight: 700, fontSize: 16, color: '#f97316' }}>No. {order.number}</span>
                      <span style={{ background: st.color + '22', color: st.color, border: '1px solid ' + st.color + '44', borderRadius: 20, padding: '2px 10px', fontSize: 12, fontWeight: 600 }}>{st.label}</span>
                    </div>
                    <p style={{ margin: '2px 0', fontSize: 14, fontWeight: 600, color: 'var(--c-text)' }}>{order.client_name || '—'}</p>
                    <p style={{ margin: '2px 0', fontSize: 13, color: 'var(--c-muted)' }}>{order.equipment_name || 'Sin equipo'} {order.brand ? '· ' + order.brand : ''}</p>
                    <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--c-muted)' }}>Recibido: {order.received_at?.slice(0,10)} {order.delivery_at ? '· Entrega: ' + order.delivery_at.slice(0,10) : ''}</p>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <button onClick={() => setViewId(order.id)} title="Ver detalle de la orden" style={{ background: 'var(--c-surface-2)', border: 'none', borderRadius: 7, padding: '7px 10px', cursor: 'pointer', color: '#3b82f6' }}><Eye size={16} /></button>
                    {hasPermission('work-reports.create') && (
                      <button onClick={() => handleOpenReport(order)} disabled={creatingReportId === order.id} title="Reporte de trabajo" style={{ background: 'var(--c-surface-2)', border: 'none', borderRadius: 7, padding: '7px 10px', cursor: 'pointer', color: '#a855f7', opacity: creatingReportId === order.id ? 0.6 : 1 }}><Camera size={16} /></button>
                    )}
                    {/* Flujo Post: una vez finalizado el reporte y sin cotizacion todavia,
                        deja crear la cotizacion con el diagnostico ya conocido. */}
                    {isPost && order.report_status === 'finalizado' && !order.quote_id && (
                      <button onClick={() => navigate('/post/cotizaciones/nueva?fromWorkOrder=' + order.id)} title="Crear cotizacion con el diagnostico" style={{ background: 'var(--c-surface-2)', border: 'none', borderRadius: 7, padding: '7px 10px', cursor: 'pointer', color: '#CA8A04' }}><FileText size={16} /></button>
                    )}
                    {/* Flujo Post: una vez la cotizacion esta aprobada y aun no hay factura, deja generarla. */}
                    {isPost && order.quote_id && order.quote_status === 'aprobada' && !order.invoice_id && hasPermission('billing.create') && (
                      <button onClick={() => handleGenerateInvoice(order)} disabled={generatingInvoiceId === order.id} title="Generar factura" style={{ background: 'var(--c-surface-2)', border: 'none', borderRadius: 7, padding: '7px 10px', cursor: 'pointer', color: '#f97316', opacity: generatingInvoiceId === order.id ? 0.6 : 1 }}><Receipt size={16} /></button>
                    )}
                    <button onClick={() => handleDownloadPDF(order)} title="Descargar PDF" style={{ background: 'var(--c-surface-2)', border: 'none', borderRadius: 7, padding: '7px 10px', cursor: 'pointer', color: '#10b981' }}><Download size={16} /></button>
                    <button onClick={() => navigate(basePath + '/' + order.id + '/editar')} title="Editar orden" style={{ background: 'var(--c-surface-2)', border: 'none', borderRadius: 7, padding: '7px 10px', cursor: 'pointer', color: 'var(--c-muted)' }}><Pencil size={16} /></button>
                    <button onClick={() => setToDelete(order)} title="Eliminar orden" style={{ background: 'var(--c-surface-2)', border: 'none', borderRadius: 7, padding: '7px 10px', cursor: 'pointer', color: '#ef4444' }}><Trash2 size={16} /></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <WorkOrderViewModal
        open={viewId != null}
        orderId={viewId}
        onClose={() => setViewId(null)}
        onDownload={handleDownloadPDF}
      />

      <ConfirmDialog
        open={toDelete != null}
        onClose={() => setToDelete(null)}
        onConfirm={handleDelete}
        title="Eliminar orden de trabajo"
        message={toDelete ? `¿Seguro que deseas eliminar la orden No. ${toDelete.number}? Esta accion no se puede deshacer.` : ''}
        confirmText="Eliminar"
      />
    </div>
  );
}
