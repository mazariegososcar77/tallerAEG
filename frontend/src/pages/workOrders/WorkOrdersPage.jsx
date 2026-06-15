import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { workOrdersApi } from '../../api/workOrdersApi.js';
import { getToken } from '../../lib/authStorage.js';
import { notify } from '../../lib/toast.js';
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx';
import WorkOrderViewModal from './WorkOrderViewModal.jsx';
import { ClipboardList, Plus, Search, Eye, Download, Pencil, Trash2 } from 'lucide-react';

const STATUS_LABELS = {
  recibido:   { label: 'Recibido',   color: '#3b82f6' },
  en_proceso: { label: 'En Proceso', color: '#f59e0b' },
  listo:      { label: 'Listo',      color: '#10b981' },
  entregado:  { label: 'Entregado',  color: '#6366f1' },
  cancelado:  { label: 'Cancelado',  color: '#ef4444' },
};

export default function WorkOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [viewId, setViewId] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    workOrdersApi.list().then(setOrders).finally(() => setLoading(false));
  }, []);

  const filtered = orders.filter(o =>
    o.number?.toLowerCase().includes(search.toLowerCase()) ||
    o.client_name?.toLowerCase().includes(search.toLowerCase()) ||
    o.equipment_name?.toLowerCase().includes(search.toLowerCase())
  );

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
            <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Ordenes de Trabajo</h1>
            <p style={{ fontSize: 13, color: 'var(--c-muted)', margin: 0 }}>{orders.length} ordenes registradas</p>
          </div>
        </div>
        <button
          onClick={() => navigate('/ordenes/nueva')}
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
          <ClipboardList size={48} style={{ opacity: 0.3, marginBottom: 12 }} />
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
                    {order.total > 0 && <span style={{ fontWeight: 700, color: '#10b981', fontSize: 15 }}>Q {Number(order.total).toFixed(2)}</span>}
                    <button onClick={() => setViewId(order.id)} title="Ver detalle de la orden" style={{ background: 'var(--c-surface-2)', border: 'none', borderRadius: 7, padding: '7px 10px', cursor: 'pointer', color: '#3b82f6' }}><Eye size={16} /></button>
                    <button onClick={() => handleDownloadPDF(order)} title="Descargar PDF" style={{ background: 'var(--c-surface-2)', border: 'none', borderRadius: 7, padding: '7px 10px', cursor: 'pointer', color: '#10b981' }}><Download size={16} /></button>
                    <button onClick={() => navigate('/ordenes/' + order.id + '/editar')} title="Editar orden" style={{ background: 'var(--c-surface-2)', border: 'none', borderRadius: 7, padding: '7px 10px', cursor: 'pointer', color: 'var(--c-muted)' }}><Pencil size={16} /></button>
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
