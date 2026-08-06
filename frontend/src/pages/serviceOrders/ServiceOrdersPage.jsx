// PANTALLA: Lista de Órdenes de Servicio — visitas técnicas de campo (servicio de
// bombas/pozos en el sitio del cliente). Muestra el cliente, la fecha de visita, el
// equipo y el estado. Desde aquí se puede buscar, crear una orden nueva, visualizar
// su PDF (en una ventana dentro de la app), descargarlo, editarla o eliminarla. El reporte técnico y las firmas ya viven dentro de la
// orden misma (ver ServiceOrderFormPage.jsx) — no hay un Reporte de Trabajo aparte.
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { serviceOrdersApi } from '../../api/serviceOrdersApi.js';
import { downloadPdf } from '../../lib/pdf.js';
import { notify } from '../../lib/toast.js';
import { useAuth } from '../../hooks/useAuth.js';
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx';
import PdfViewerModal from '../../components/ui/PdfViewerModal.jsx';
import { Truck, Plus, Search, Download, Pencil, Trash2, FileSearch } from 'lucide-react';

const STATUS_LABELS = {
  programada: { label: 'Programada', color: '#3b82f6' },
  en_proceso: { label: 'En Proceso', color: '#f59e0b' },
  completada: { label: 'Completada', color: '#10b981' },
  cancelada:  { label: 'Cancelada',  color: '#ef4444' },
};

export default function ServiceOrdersPage() {
  const { hasPermission } = useAuth();
  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [toDelete, setToDelete] = useState(null);
  const [pdfOrder, setPdfOrder] = useState(null); // orden que se esta viendo en el visor de PDF
  const navigate = useNavigate();

  useEffect(() => {
    serviceOrdersApi.list().then(setOrders).finally(() => setLoading(false));
  }, []);

  const filtered = orders.filter(o =>
    o.number?.toLowerCase().includes(search.toLowerCase()) ||
    o.client_name?.toLowerCase().includes(search.toLowerCase()) ||
    o.client_address?.toLowerCase().includes(search.toLowerCase()) ||
    o.equipment_name?.toLowerCase().includes(search.toLowerCase())
  );

  const handleDownloadPDF = async (order) => {
    try {
      await downloadPdf('/api/service-orders/' + order.id + '/pdf', 'orden-servicio-' + order.number + '.pdf');
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
            <p style={{ fontSize: 13, color: 'var(--c-muted)', margin: 0 }}>{orders.length} visitas registradas</p>
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
          placeholder="Buscar por No., cliente, dirección o equipo..."
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
            const st = STATUS_LABELS[order.status] || STATUS_LABELS.programada;
            return (
              <div key={order.id} style={{ background: 'var(--c-surface)', border: '1px solid var(--c-line)', borderRadius: 12, padding: '14px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                      <span style={{ fontWeight: 700, fontSize: 16, color: '#f97316' }}>No. {order.number}</span>
                      <span style={{ background: st.color + '22', color: st.color, border: '1px solid ' + st.color + '44', borderRadius: 20, padding: '2px 10px', fontSize: 12, fontWeight: 600 }}>{st.label}</span>
                    </div>
                    <p style={{ margin: '2px 0', fontSize: 14, fontWeight: 600, color: 'var(--c-text)' }}>{order.client_name || order.client_address || 'Sin cliente'}</p>
                    <p style={{ margin: '2px 0', fontSize: 13, color: 'var(--c-muted)' }}>{order.equipment_name || 'Sin equipo'} {order.brand ? '· ' + order.brand : ''}</p>
                    <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--c-muted)' }}>
                      Visita: {order.visit_date?.slice(0,10)}{order.visit_time ? ' ' + order.visit_time : ''}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <button onClick={() => setPdfOrder(order)} title="Visualizar PDF" style={{ background: 'var(--c-surface-2)', border: 'none', borderRadius: 7, padding: '7px 10px', cursor: 'pointer', color: '#0ea5e9' }}><FileSearch size={16} /></button>
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

      {/* Visor del PDF dentro de la app (no abre otra pestaña) */}
      <PdfViewerModal
        open={pdfOrder != null}
        onClose={() => setPdfOrder(null)}
        url={pdfOrder ? `/api/service-orders/${pdfOrder.id}/pdf` : null}
        fileName={pdfOrder ? `orden-servicio-${pdfOrder.number}.pdf` : ''}
        title={pdfOrder ? `Orden de Servicio No. ${pdfOrder.number}` : ''}
      />

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
