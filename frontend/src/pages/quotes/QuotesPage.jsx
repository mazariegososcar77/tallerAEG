import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { quotesApi } from '../../api/quotesApi.js';
import { FileText, Plus, Search, Eye, Pencil, Trash2, Download } from 'lucide-react';
import { getToken } from '../../lib/authStorage.js';

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
  const navigate = useNavigate();

  const handleDownloadPDF = async (q) => {
    try {
      const token = getToken();
      const res = await fetch(`/api/quotes/${q.id}/pdf`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cotizacion-${q.number}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch(e) { alert('Error al generar PDF'); }
  };

  useEffect(() => {
    quotesApi.list().then(setQuotes).finally(() => setLoading(false));
  }, []);

  const filtered = quotes.filter(q =>
    q.number?.toLowerCase().includes(search.toLowerCase()) ||
    q.client_name?.toLowerCase().includes(search.toLowerCase()) ||
    q.equipment_name?.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar esta cotización?')) return;
    await quotesApi.remove(id);
    setQuotes(prev => prev.filter(q => q.id !== id));
  };

  return (
    <div style={{ padding: '20px 16px', maxWidth: 1100, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <FileText size={26} color="#E8551C" />
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Cotizaciones</h1>
            <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>{quotes.length} cotizaciones registradas</p>
          </div>
        </div>
        <button
          onClick={() => navigate('/cotizaciones/nueva')}
          style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#E8551C', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 18px', fontWeight: 600, cursor: 'pointer', fontSize: 14 }}
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
          <FileText size={48} style={{ opacity: 0.3, marginBottom: 12 }} />
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
                      <span style={{ fontWeight: 700, fontSize: 16, color: '#E8551C' }}>No. {q.number}</span>
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
                    <button onClick={() => handleDownloadPDF(q)} title="Descargar PDF" style={{ background: 'var(--c-surface-2)', border: 'none', borderRadius: 7, padding: '7px 10px', cursor: 'pointer', color: '#10b981' }}><Download size={16} /></button>
                    <button onClick={() => navigate('/cotizaciones/' + q.id + '/editar')} style={{ background: 'var(--c-surface-2)', border: 'none', borderRadius: 7, padding: '7px 10px', cursor: 'pointer', color: '#94a3b8' }}><Eye size={16} /></button>
                    <button onClick={() => navigate('/cotizaciones/' + q.id + '/editar')} style={{ background: 'var(--c-surface-2)', border: 'none', borderRadius: 7, padding: '7px 10px', cursor: 'pointer', color: '#94a3b8' }}><Pencil size={16} /></button>
                    <button onClick={() => handleDelete(q.id)} style={{ background: 'var(--c-surface-2)', border: 'none', borderRadius: 7, padding: '7px 10px', cursor: 'pointer', color: '#ef4444' }}><Trash2 size={16} /></button>
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
