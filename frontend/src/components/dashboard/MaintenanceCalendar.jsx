import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ChevronDown, CalendarDays, Wrench, ClipboardList } from 'lucide-react';
import { maintenanceApi } from '../../api/maintenanceApi.js';
import { workOrdersApi } from '../../api/workOrdersApi.js';
import { notify } from '../../lib/toast.js';
import { useIsMobile } from '../../hooks/useIsMobile.js';
import Modal from '../ui/Modal.jsx';

const C = { card:'var(--c-surface)', dark:'var(--c-surface-2)', border:'var(--c-line)', text:'var(--c-text)', muted:'var(--c-muted)', orange:'#E8551C', red:'#ef4444' };
const STATUS = {
  vencido: { label: 'Vencido', color: '#ef4444' },
  proximo: { label: 'Proximo', color: '#f59e0b' },
  al_dia:  { label: 'Al dia',  color: '#1D9E75' },
};
const WO_STATUS = {
  recibido:   { label: 'Recibido',   color: '#3b82f6' },
  en_proceso: { label: 'En Proceso', color: '#f59e0b' },
  listo:      { label: 'Listo',      color: '#10b981' },
  entregado:  { label: 'Entregado',  color: '#6366f1' },
  cancelado:  { label: 'Cancelado',  color: '#ef4444' },
};
const FREQ = { mensual:'Mensual', trimestral:'Trimestral', semestral:'Semestral', anual:'Anual', personalizado:'Personalizado' };
const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const DOW = ['Dom','Lun','Mar','Mie','Jue','Vie','Sab'];
const pad = (n) => String(n).padStart(2, '0');

// Opciones del filtro del calendario (label corto para pantallas angostas).
const FILTERS = [
  { value: 'all',         label: 'Todos',          short: 'Todos',   Icon: CalendarDays },
  { value: 'maintenance', label: 'Mantenimientos', short: 'Mant.',   Icon: Wrench },
  { value: 'orders',      label: 'Ordenes',        short: 'Ordenes', Icon: ClipboardList },
];

const navBtn = { width:30, height:30, display:'flex', alignItems:'center', justifyContent:'center', background:C.dark, border:'1px solid '+C.border, borderRadius:7, color:C.text, cursor:'pointer' };

/**
 * Mini calendario que marca, por dia:
 *  - los mantenimientos (fecha de proximo servicio) en naranja
 *  - las entregas de ordenes de trabajo (fecha de entrega) en rojo
 * El filtro permite ver ambos, solo mantenimientos o solo ordenes.
 */
export default function MaintenanceCalendar() {
  const today = new Date();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [records, setRecords] = useState([]);
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState('all');
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState(null);
  const [open, setOpen] = useState(false); // en movil el calendario inicia colapsado

  const showBody = !isMobile || open;

  useEffect(() => {
    maintenanceApi.list().then(setRecords).catch(err => notify.error(err.message));
    workOrdersApi.list().then(setOrders).catch(err => notify.error(err.message));
  }, []);

  const showMaint = filter === 'all' || filter === 'maintenance';
  const showOrders = filter === 'all' || filter === 'orders';

  // Agrupa los mantenimientos por fecha de proximo servicio (YYYY-MM-DD).
  const maintByDate = useMemo(() => {
    const map = {};
    for (const r of records) {
      const key = r.next_service ? String(r.next_service).slice(0, 10) : null;
      if (!key) continue;
      (map[key] ||= []).push(r);
    }
    return map;
  }, [records]);

  // Agrupa las ordenes de trabajo por fecha de entrega (YYYY-MM-DD).
  const ordersByDate = useMemo(() => {
    const map = {};
    for (const o of orders) {
      const key = o.delivery_at ? String(o.delivery_at).slice(0, 10) : null;
      if (!key) continue;
      (map[key] ||= []).push(o);
    }
    return map;
  }, [orders]);

  const cells = useMemo(() => {
    const firstWeekday = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const arr = [];
    for (let i = 0; i < firstWeekday; i++) arr.push(null);
    for (let d = 1; d <= daysInMonth; d++) arr.push(d);
    return arr;
  }, [viewYear, viewMonth]);

  const todayKey = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;

  const prevMonth = () => setViewMonth(m => {
    if (m === 0) { setViewYear(y => y - 1); return 11; }
    return m - 1;
  });
  const nextMonth = () => setViewMonth(m => {
    if (m === 11) { setViewYear(y => y + 1); return 0; }
    return m + 1;
  });
  const goToday = () => { setViewYear(today.getFullYear()); setViewMonth(today.getMonth()); };

  const selMaint = selectedDate && showMaint ? (maintByDate[selectedDate] || []) : [];
  const selOrders = selectedDate && showOrders ? (ordersByDate[selectedDate] || []) : [];
  const fmtLong = (key) => {
    const [y, m, d] = key.split('-').map(Number);
    return `${d} de ${MONTHS[m - 1]} de ${y}`;
  };

  return (
    <div style={{ background:C.card, border:'1px solid '+C.border, borderRadius:12, padding:16, width:'100%' }}>

      {/* Movil: boton para mostrar/ocultar el calendario */}
      {isMobile && (
        <button
          onClick={() => setOpen(o => !o)}
          title={open ? 'Ocultar calendario' : 'Ver calendario'}
          style={{ display:'flex', width:'100%', alignItems:'center', justifyContent:'space-between', gap:8, background:C.dark, border:'1px solid '+C.border, borderRadius:8, padding:'10px 14px', cursor:'pointer', color:C.text }}
        >
          <span style={{ display:'flex', alignItems:'center', gap:8 }}>
            <CalendarDays size={18} color={C.orange} />
            <span style={{ fontWeight:700, fontSize:14 }}>{open ? 'Ocultar calendario' : 'Ver calendario'}</span>
          </span>
          <ChevronDown size={18} style={{ color:C.muted, transition:'transform .2s', transform: open ? 'rotate(180deg)' : 'none' }} />
        </button>
      )}

      {showBody && (
      <div style={{ marginTop: isMobile ? 12 : 0 }}>
      {/* Cabecera: navegacion de mes + filtro de anio */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8, marginBottom:12, flexWrap:'wrap' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <button onClick={prevMonth} title="Mes anterior" style={navBtn}><ChevronLeft size={16} /></button>
          <span style={{ fontWeight:700, color:C.text, fontSize:14, minWidth:120, textAlign:'center' }}>{MONTHS[viewMonth]} {viewYear}</span>
          <button onClick={nextMonth} title="Mes siguiente" style={navBtn}><ChevronRight size={16} /></button>
        </div>
        <button onClick={goToday} title="Ir al mes actual" style={{ ...navBtn, width:'auto', padding:'0 12px', fontSize:12, fontWeight:600 }}>Hoy</button>
      </div>

      {/* Filtro: todos / mantenimientos / ordenes */}
      <div style={{ display:'flex', gap:6, marginBottom:12, background:C.dark, border:'1px solid '+C.border, borderRadius:9, padding:4 }}>
        {FILTERS.map(f => {
          const active = filter === f.value;
          return (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              style={{
                flex:1, minWidth:0, display:'flex', alignItems:'center', justifyContent:'center', gap:6, padding:'7px 6px',
                borderRadius:6, border:'none', cursor:'pointer', fontSize:12, fontWeight:700, whiteSpace:'nowrap',
                background: active ? C.orange : 'transparent',
                color: active ? '#fff' : C.muted,
                transition:'background .15s, color .15s',
              }}
            >
              <f.Icon size={14} style={{ flexShrink:0 }} /> {isMobile ? f.short : f.label}
            </button>
          );
        })}
      </div>

      {/* Dias de la semana */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7, 1fr)', gap:4, marginBottom:4 }}>
        {DOW.map(d => <span key={d} style={{ textAlign:'center', fontSize:10, fontWeight:800, color:C.muted, textTransform:'uppercase' }}>{d}</span>)}
      </div>

      {/* Rejilla del mes */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7, 1fr)', gap:4 }}>
        {cells.map((day, i) => {
          if (day === null) return <div key={'b' + i} />;
          const key = `${viewYear}-${pad(viewMonth + 1)}-${pad(day)}`;
          const maintItems = showMaint ? (maintByDate[key] || []) : [];
          const orderItems = showOrders ? (ordersByDate[key] || []) : [];
          const hasMaint = maintItems.length > 0;
          const hasOrder = orderItems.length > 0;
          const has = hasMaint || hasOrder;
          const isToday = key === todayKey;
          // El naranja (mantenimiento) tiñe la celda; si solo hay ordenes, tiñe en rojo.
          const tint = hasMaint ? C.orange : (hasOrder ? C.red : null);
          const titleParts = [];
          if (hasMaint) titleParts.push(`${maintItems.length} mantenimiento(s)`);
          if (hasOrder) titleParts.push(`${orderItems.length} entrega(s) de orden`);
          return (
            <button
              key={key}
              onClick={() => has && setSelectedDate(key)}
              disabled={!has}
              title={has ? titleParts.join(' · ') : undefined}
              style={{
                position:'relative', aspectRatio:'1 / 0.82', minHeight:36, borderRadius:8, fontSize:'clamp(12px, 1.4vw, 15px)', fontWeight:isToday ? 800 : 500,
                border:'1px solid ' + (isToday ? C.orange : (has ? tint + '66' : 'transparent')),
                background: has ? tint + '22' : 'transparent',
                color: has ? tint : C.text,
                cursor: has ? 'pointer' : 'default',
                display:'flex', alignItems:'center', justifyContent:'center', padding:0,
              }}
            >
              {day}
              {has && (
                <span style={{ position:'absolute', bottom:3, left:0, right:0, display:'flex', alignItems:'center', justifyContent:'center', gap:3 }}>
                  {hasMaint && <span style={{ width:5, height:5, borderRadius:'50%', background:C.orange }} />}
                  {hasOrder && <span style={{ width:5, height:5, borderRadius:'50%', background:C.red }} />}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Leyenda */}
      <div style={{ display:'flex', gap:16, marginTop:12, flexWrap:'wrap' }}>
        <span style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, color:C.muted }}>
          <span style={{ width:8, height:8, borderRadius:'50%', background:C.orange }} /> Mantenimiento
        </span>
        <span style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, color:C.muted }}>
          <span style={{ width:8, height:8, borderRadius:'50%', background:C.red }} /> Entrega de orden
        </span>
      </div>
      </div>
      )}

      {/* Modal con lo programado para el dia seleccionado */}
      <Modal
        open={Boolean(selectedDate)}
        onClose={() => setSelectedDate(null)}
        title={selectedDate ? fmtLong(selectedDate) : ''}
        size="md"
        accentColor={C.orange}
      >
        {selMaint.length === 0 && selOrders.length === 0 ? (
          <div style={{ textAlign:'center', padding:'24px 0', color:C.muted }}>
            <CalendarDays size={36} style={{ opacity:.3, marginBottom:8 }} />
            <p style={{ margin:0, fontSize:14 }}>No hay nada programado para esta fecha.</p>
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:18 }}>

            {/* Mantenimientos */}
            {selMaint.length > 0 && (
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                <p style={{ margin:0, fontSize:12, fontWeight:800, color:C.orange, textTransform:'uppercase', letterSpacing:'.5px', display:'flex', alignItems:'center', gap:6 }}>
                  <Wrench size={14} /> {selMaint.length} mantenimiento(s)
                </p>
                {selMaint.map(r => {
                  const st = STATUS[r.status] || STATUS.al_dia;
                  return (
                    <div key={r.id} style={{ border:'1px solid '+C.border, borderRadius:10, padding:'12px 14px', background:C.dark }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                        <span style={{ fontWeight:700, color:C.text, fontSize:14 }}>{r.machine_name || 'Maquina'}</span>
                        <span style={{ background:st.color+'22', color:st.color, border:'1px solid '+st.color+'44', borderRadius:20, padding:'2px 10px', fontSize:11, fontWeight:700 }}>{st.label}</span>
                      </div>
                      <p style={{ margin:'4px 0 0', fontSize:13, color:C.orange }}>{r.client_name || '—'}</p>
                      <p style={{ margin:'2px 0 0', fontSize:12, color:C.muted }}>
                        {FREQ[r.frequency] || r.frequency || '—'}
                        {r.description ? ' · ' + r.description : ''}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Ordenes de trabajo (entregas) */}
            {selOrders.length > 0 && (
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                <p style={{ margin:0, fontSize:12, fontWeight:800, color:C.red, textTransform:'uppercase', letterSpacing:'.5px', display:'flex', alignItems:'center', gap:6 }}>
                  <ClipboardList size={14} /> {selOrders.length} entrega(s) de orden
                </p>
                {selOrders.map(o => {
                  const st = WO_STATUS[o.status] || WO_STATUS.recibido;
                  return (
                    <button
                      key={o.id}
                      onClick={() => { setSelectedDate(null); navigate(`/ordenes/${o.id}/editar`); }}
                      style={{ textAlign:'left', border:'1px solid '+C.border, borderRadius:10, padding:'12px 14px', background:C.dark, cursor:'pointer', width:'100%' }}
                    >
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                        <span style={{ fontWeight:800, color:C.text, fontSize:14 }}>Orden No. {o.number}</span>
                        <span style={{ background:st.color+'22', color:st.color, border:'1px solid '+st.color+'44', borderRadius:20, padding:'2px 10px', fontSize:11, fontWeight:700 }}>{st.label}</span>
                      </div>
                      <p style={{ margin:'4px 0 0', fontSize:13, color:C.orange }}>{o.client_name || '—'}</p>
                      {(o.equipment_name || o.work_type) && (
                        <p style={{ margin:'2px 0 0', fontSize:12, color:C.muted }}>
                          {[o.equipment_name, o.work_type].filter(Boolean).join(' · ')}
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
