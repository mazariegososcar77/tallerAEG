import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wrench, ClipboardList, CalendarClock } from 'lucide-react';
import { maintenanceApi } from '../../api/maintenanceApi.js';
import { workOrdersApi } from '../../api/workOrdersApi.js';
import { notify } from '../../lib/toast.js';

const C = { card:'var(--c-surface)', dark:'var(--c-surface-2)', border:'var(--c-line)', text:'var(--c-text)', muted:'var(--c-muted)', orange:'#E8551C', red:'#ef4444' };
const MONTHS_SHORT = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
const pad = (n) => String(n).padStart(2, '0');

// Etiqueta relativa amigable (Hoy / Mañana / "en N días") para el encabezado de cada item.
function relativeLabel(key, todayKey) {
  if (key === todayKey) return { text: 'Hoy', color: C.red };
  const [y1, m1, d1] = key.split('-').map(Number);
  const [y2, m2, d2] = todayKey.split('-').map(Number);
  const diff = Math.round((Date.UTC(y1, m1 - 1, d1) - Date.UTC(y2, m2 - 1, d2)) / 86400000);
  if (diff === 1) return { text: 'Mañana', color: C.orange };
  if (diff > 1 && diff <= 30) return { text: `En ${diff} días`, color: C.muted };
  return null;
}

function DateBadge({ dateKey }) {
  const [, m, d] = dateKey.split('-').map(Number);
  return (
    <div style={{ flexShrink:0, width:48, textAlign:'center', background:C.dark, border:'1px solid '+C.border, borderRadius:9, padding:'6px 0' }}>
      <div style={{ fontSize:18, fontWeight:800, color:C.text, lineHeight:1 }}>{pad(d)}</div>
      <div style={{ fontSize:10, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:.5 }}>{MONTHS_SHORT[m - 1]}</div>
    </div>
  );
}

/**
 * Resumen de lo que viene: próximos mantenimientos programados (por fecha de
 * próximo servicio) y entregas de órdenes de trabajo (por fecha de entrega),
 * combinados y ordenados por fecha ascendente desde hoy en adelante.
 */
export default function UpcomingSummary() {
  const navigate = useNavigate();
  const [records, setRecords] = useState([]);
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    maintenanceApi.list().then(setRecords).catch(err => notify.error(err.message));
    workOrdersApi.list().then(setOrders).catch(err => notify.error(err.message));
  }, []);

  const today = new Date();
  const todayKey = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;

  // Combina mantenimientos y órdenes en una sola lista de eventos futuros.
  const items = useMemo(() => {
    const list = [];
    for (const r of records) {
      const key = r.next_service ? String(r.next_service).slice(0, 10) : null;
      if (!key || key < todayKey) continue;
      list.push({
        id: 'm-' + r.id, dateKey: key, type: 'maintenance', color: C.orange, Icon: Wrench,
        title: r.machine_name || 'Mantenimiento',
        subtitle: r.client_name || '—',
        onClick: () => navigate('/mantenimientos'),
      });
    }
    for (const o of orders) {
      const key = o.delivery_at ? String(o.delivery_at).slice(0, 10) : null;
      if (!key || key < todayKey) continue;
      if (o.status === 'entregado' || o.status === 'cancelado') continue;
      list.push({
        id: 'o-' + o.id, dateKey: key, type: 'order', color: C.red, Icon: ClipboardList,
        title: `Orden No. ${o.number}`,
        subtitle: o.client_name || '—',
        onClick: () => navigate(`/ordenes/${o.id}/editar`),
      });
    }
    return list.sort((a, b) => (a.dateKey < b.dateKey ? -1 : a.dateKey > b.dateKey ? 1 : 0));
  }, [records, orders, todayKey, navigate]);

  return (
    <div style={{ background:C.card, border:'1px solid '+C.border, borderRadius:12, padding:16, display:'flex', flexDirection:'column', minHeight:0 }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
        <CalendarClock size={18} color={C.orange} />
        <span style={{ fontWeight:800, color:C.text, fontSize:15 }}>Próximas fechas</span>
        {items.length > 0 && (
          <span style={{ marginLeft:'auto', background:C.dark, border:'1px solid '+C.border, borderRadius:20, padding:'2px 10px', fontSize:12, fontWeight:700, color:C.muted }}>{items.length}</span>
        )}
      </div>

      {items.length === 0 ? (
        <div style={{ textAlign:'center', padding:'32px 0', color:C.muted }}>
          <CalendarClock size={34} style={{ opacity:.3, marginBottom:8 }} />
          <p style={{ margin:0, fontSize:13 }}>No hay mantenimientos ni entregas programadas.</p>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:10, overflowY:'auto', minHeight:0 }} className="no-scrollbar">
          {items.map(it => {
            const rel = relativeLabel(it.dateKey, todayKey);
            return (
              <button
                key={it.id}
                onClick={it.onClick}
                style={{ display:'flex', alignItems:'center', gap:12, textAlign:'left', width:'100%', background:'transparent', border:'1px solid '+C.border, borderRadius:11, padding:'10px 12px', cursor:'pointer', transition:'background .15s, border-color .15s' }}
                onMouseEnter={e => { e.currentTarget.style.background = C.dark; e.currentTarget.style.borderColor = it.color + '66'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = C.border; }}
              >
                <DateBadge dateKey={it.dateKey} />
                <div style={{ minWidth:0, flex:1 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <it.Icon size={13} color={it.color} style={{ flexShrink:0 }} />
                    <span style={{ fontWeight:700, color:C.text, fontSize:14, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{it.title}</span>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:2 }}>
                    <span style={{ fontSize:12, color:C.muted, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', minWidth:0 }}>{it.subtitle}</span>
                    {rel && <span style={{ flexShrink:0, marginLeft:'auto', fontSize:11, fontWeight:700, color:rel.color }}>{rel.text}</span>}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
