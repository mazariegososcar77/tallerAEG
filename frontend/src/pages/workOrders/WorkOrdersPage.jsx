import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { workOrdersApi } from '../../api/workOrdersApi.js';
import { getToken } from '../../lib/authStorage.js';
import { ClipboardList, Plus, Search, Eye, Pencil, Trash2 } from 'lucide-react';

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
    } catch(e) { alert('Error al generar PDF'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar esta orden de trabajo?')) return;
    await workOrdersApi.remove(id);
    setOrders(prev => prev.filter(o => o.id !== id));
  };

  return (
    <div style={{ padding: '20px 16px', maxWidth: 1100, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <ClipboardList size={26} color="#f97316" />
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Ordenes de Trabajo</h1>
            <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>{orders.length} ordenes registradas</p>
          </div>
        </div>
        <button
          onClick={() => navigate('/ordenes/nueva')}
          style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f97316', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 18px', fontWeight: 600, cursor: 'pointer', fontSize: 14 }}
        >
          <Plus size={18} /> Nueva Orden
        </button>
      </div>

      {/* Buscador */}
      <div style={{ position: 'relative', marginBottom: 16 }}>
        <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por No., cliente o equipo..."
          style={{ width: '100%', padding: '10px 12px 10px 36px', borderRadius: 8, border: '1px solid #1e2d45', background: '#0f172a', color: '#e2e8f0', fontSize: 14, boxSizing: 'border-box' }}
        />
      </div>

      {/* Lista */}
      {loading ? (
        <p style={{ color: '#64748b', textAlign: 'center', marginTop: 40 }}>Cargando...</p>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', marginTop: 60, color: '#64748b' }}>
          <ClipboardList size={48} style={{ opacity: 0.3, marginBottom: 12 }} />
          <p>No hay ordenes registradas</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(order => {
            const st = STATUS_LABELS[order.status] || STATUS_LABELS.recibido;
            return (
              <div key={order.id} style={{ background: '#151d2e', border: '1px solid #1e2d45', borderRadius: 12, padding: '14px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                      <span style={{ fontWeight: 700, fontSize: 16, color: '#f97316' }}>No. {order.number}</span>
                      <span style={{ background: st.color + '22', color: st.color, border: '1px solid ' + st.color + '44', borderRadius: 20, padding: '2px 10px', fontSize: 12, fontWeight: 600 }}>{st.label}</span>
                    </div>
                    <p style={{ margin: '2px 0', fontSize: 14, fontWeight: 600, color: '#e2e8f0' }}>{order.client_name || '—'}</p>
                    <p style={{ margin: '2px 0', fontSize: 13, color: '#94a3b8' }}>{order.equipment_name || 'Sin equipo'} {order.brand ? '· ' + order.brand : ''}</p>
                    <p style={{ margin: '4px 0 0', fontSize: 12, color: '#64748b' }}>Recibido: {order.received_at?.slice(0,10)} {order.delivery_at ? '· Entrega: ' + order.delivery_at.slice(0,10) : ''}</p>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {order.total > 0 && <span style={{ fontWeight: 700, color: '#10b981', fontSize: 15 }}>Q {Number(order.total).toFixed(2)}</span>}
                    <button onClick={() => handleDownloadPDF(order)} style={{ background: '#1e2d45', border: 'none', borderRadius: 7, padding: '7px 10px', cursor: 'pointer', color: '#10b981' }}><Eye size={16} /></button>
                    <button onClick={() => navigate('/ordenes/' + order.id + '/editar')} style={{ background: '#1e2d45', border: 'none', borderRadius: 7, padding: '7px 10px', cursor: 'pointer', color: '#94a3b8' }}><Pencil size={16} /></button>
                    <button onClick={() => handleDelete(order.id)} style={{ background: '#1e2d45', border: 'none', borderRadius: 7, padding: '7px 10px', cursor: 'pointer', color: '#ef4444' }}><Trash2 size={16} /></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
