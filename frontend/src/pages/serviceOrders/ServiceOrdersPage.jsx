// PANTALLA: Lista de Órdenes de Servicio (trabajos subcontratados fuera del
// taller). Muestra el subcontratista, el cliente relacionado (si tiene), el
// estado y los costos acordado/real — a diferencia de Órdenes de Trabajo, aquí
// SÍ se muestran precios, porque es informacion administrativa interna para
// Abdías, no algo que vea un técnico. Desde aquí se puede buscar, crear una
// orden nueva, descargar el PDF, editarla, eliminarla, o abrir/crear su
// Reporte de Trabajo fotográfico con el ícono de cámara (mismo mecanismo que
// usan las órdenes de trabajo internas).
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { serviceOrdersApi } from '../../api/serviceOrdersApi.js';
import { workReportsApi } from '../../api/workReportsApi.js';
import { getToken } from '../../lib/authStorage.js';
import { notify } from '../../lib/toast.js';
import { useAuth } from '../../hooks/useAuth.js';
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx';
import { Truck, Plus, Search, Download, Pencil, Trash2, Camera } from 'lucide-react';

const STATUS_LABELS = {
  enviada:    { label: 'Enviada',    color: '#3b82f6' },
  en_proceso: { label: 'En Proceso', color: '#f59e0b' },
  recibida:   { label: 'Recibida',   color: '#10b981' },
  cancelada:  { label: 'Cancelada',  color: '#ef4444' },
};

export default function ServiceOrdersPage() {
  const { hasPermission } = useAuth();
  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [toDelete, setToDelete] = useState(null);
  const [creatingReportId, setCreatingReportId] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    serviceOrdersApi.list().then(setOrders).finally(() => setLoading(false));
  }, []);

  // Abre el Reporte de Trabajo de esta orden de servicio. Si todavia no tiene
  // reporte, lo crea (idempotente, igual que en Ordenes de Trabajo).
  const handleOpenReport = async (order) => {
    setCreatingReportId(order.id);
    try {
      const report = await workReportsApi.createForServiceOrder(order.id);
      navigate('/reportes/' + report.id + '/editar');
    } catch (e) {
      notify.error(e.message || 'No se pudo abrir el reporte');
    } finally {
      setCreatingReportId(null);
    }
  };

  const filtered = orders.filter(o =>
    o.number?.toLowerCase().includes(search.toLowerCase()) ||
    o.subcontractor_name?.toLowerCase().includes(search.toLowerCase()) ||
    o.client_name?.toLowerCase().includes(search.toLowerCase()) ||
    o.description?.toLowerCase().includes(search.toLowerCase())
  );

  const handleDownloadPDF = async (order) => {
    try {
      const token = getToken();
      const res = await fetch('/api/service-orders/' + order.id + '/pdf', {
        headers: { Authorization: 'Bearer ' + token }
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'orden-servicio-' + order.number + '.pdf';
      a.click();
      URL.revokeObjectURL(url);
    } catch(e) { notify.error('Error al generar PDF'); }
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    try {
      await serviceOrdersApi.remove(toDelete.id);
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Truck size={26} color="#f97316" />
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Ordenes de Servicio</h1>
            <p style={{ fontSize: 13, color: 'var(--c-muted)', margin: 0 }}>{orders.length} ordenes registradas</p>
          </div>
        </div>
        {hasPermission('service-orders.create') && (
          <button
            onClick={() => navigate('/ordenes-servicio/nueva')}
            title="Crear una nueva orden de servicio"
            style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f97316', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 18px', fontWeight: 600, cursor: 'pointer', fontSize: 14 }}
          >
            <Plus size={18} /> Nueva Orden
          </button>
        )}
      </div>

      <div style={{ position: 'relative', marginBottom: 16 }}>
        <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--c-muted)' }} />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por No., subcontratista, cliente o descripcion..."
          style={{ width: '100%', padding: '10px 12px 10px 36px', borderRadius: 8, border: '1px solid var(--c-line)', background: 'var(--c-surface-2)', color: 'var(--c-text)', fontSize: 14, boxSizing: 'border-box' }}
        />
      </div>

      {loading ? (
        <p style={{ color: 'var(--c-muted)', textAlign: 'center', marginTop: 40 }}>Cargando...</p>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', marginTop: 60, color: 'var(--c-muted)' }}>
          <Truck size={48} style={{ opacity: 0.3, marginBottom: 12 }} />
          <p>No hay ordenes de servicio registradas</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(order => {
            const st = STATUS_LABELS[order.status] || STATUS_LABELS.enviada;
            return (
              <div key={order.id} style={{ background: 'var(--c-surface)', border: '1px solid var(--c-line)', borderRadius: 12, padding: '14px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                      <span style={{ fontWeight: 700, fontSize: 16, color: '#f97316' }}>No. {order.number}</span>
                      <span style={{ background: st.color + '22', color: st.color, border: '1px solid ' + st.color + '44', borderRadius: 20, padding: '2px 10px', fontSize: 12, fontWeight: 600 }}>{st.label}</span>
                    </div>
                    <p style={{ margin: '2px 0', fontSize: 14, fontWeight: 600, color: 'var(--c-text)' }}>{order.subcontractor_name}</p>
                    {order.client_name && <p style={{ margin: '2px 0', fontSize: 13, color: 'var(--c-muted)' }}>Cliente: {order.client_name}</p>}
                    <p style={{ margin: '2px 0', fontSize: 13, color: 'var(--c-muted)' }}>{order.description}</p>
                    <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--c-muted)' }}>
                      Enviado: {order.sent_at?.slice(0,10)}
                      {order.agreed_cost ? ' · Acordado: Q' + Number(order.agreed_cost).toFixed(2) : ''}
                      {order.actual_cost ? ' · Real: Q' + Number(order.actual_cost).toFixed(2) : ''}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {hasPermission('work-reports.create') && (
                      <button onClick={() => handleOpenReport(order)} disabled={creatingReportId === order.id} title="Reporte de trabajo" style={{ background: 'var(--c-surface-2)', border: 'none', borderRadius: 7, padding: '7px 10px', cursor: 'pointer', color: '#a855f7', opacity: creatingReportId === order.id ? 0.6 : 1 }}><Camera size={16} /></button>
                    )}
                    <button onClick={() => handleDownloadPDF(order)} title="Descargar PDF" style={{ background: 'var(--c-surface-2)', border: 'none', borderRadius: 7, padding: '7px 10px', cursor: 'pointer', color: '#10b981' }}><Download size={16} /></button>
                    {hasPermission('service-orders.update') && (
                      <button onClick={() => navigate('/ordenes-servicio/' + order.id + '/editar')} title="Editar orden" style={{ background: 'var(--c-surface-2)', border: 'none', borderRadius: 7, padding: '7px 10px', cursor: 'pointer', color: 'var(--c-muted)' }}><Pencil size={16} /></button>
                    )}
                    {hasPermission('service-orders.delete') && (
                      <button onClick={() => setToDelete(order)} title="Eliminar orden" style={{ background: 'var(--c-surface-2)', border: 'none', borderRadius: 7, padding: '7px 10px', cursor: 'pointer', color: '#ef4444' }}><Trash2 size={16} /></button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={toDelete != null}
        onClose={() => setToDelete(null)}
        onConfirm={handleDelete}
        title="Eliminar orden de servicio"
        message={toDelete ? `¿Seguro que deseas eliminar la orden No. ${toDelete.number}? Esta accion no se puede deshacer.` : ''}
        confirmText="Eliminar"
      />
    </div>
  );
}
