import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { workOrdersApi } from '../../api/workOrdersApi.js';
import { clientsApi } from '../../api/clientsApi.js';
import { getToken } from '../../lib/authStorage.js';
import { withUppercase } from '../../lib/text.js';

const WORK_TYPES = ['Rebobinado','Mantenimiento','Reparacion','Cambio de conexion','Calculo de voltaje','Otros'];
const STATUS_OPTIONS = [
  { value:'recibido',   label:'Recibido' },
  { value:'en_proceso', label:'En Proceso' },
  { value:'listo',      label:'Listo' },
  { value:'entregado',  label:'Entregado' },
  { value:'cancelado',  label:'Cancelado' },
];
const STATUS_COLORS = { recibido:'#1D9E75', en_proceso:'#E8551C', listo:'#3b82f6', entregado:'#6366f1', cancelado:'#ef4444' };
const DEFAULT_ITEMS = ['Polea','Caja de conexion','Tapa de conexion','Bornera','Argolla','Ventilador','Lazo','Tolva','Placa de datos','Impulsor','Difusor','Housing de impulsor','Caja reductora','Cadena','Tapa capacitor','Base quebrada de motor','Tapas quebradas','Capacitores','Cuña','Retenedor'];
const C = { bg:'var(--c-app)', card:'var(--c-surface)', dark:'var(--c-surface-2)', border:'var(--c-line)', input:'var(--c-surface-2)', text:'var(--c-text)', muted:'var(--c-muted)', orange:'#E8551C' };
const inp = { width:'100%', background:C.input, border:'1px solid '+C.border, color:C.text, padding:'8px 10px', borderRadius:6, fontSize:12, boxSizing:'border-box', outline:'none' };
const lbl = { display:'block', fontSize:10, fontWeight:800, color:C.muted, textTransform:'uppercase', letterSpacing:'.6px', marginBottom:5 };
const sec = { background:C.card, border:'1px solid '+C.border, borderRadius:10, marginBottom:12, overflow:'hidden' };
const secHdr = { background:C.dark, borderBottom:'1px solid '+C.border, padding:'9px 16px', display:'flex', alignItems:'center', gap:8 };
const secTtl = { fontSize:11, fontWeight:800, color:C.orange, letterSpacing:'1px', textTransform:'uppercase' };
const secBody = { padding:'14px 16px' };

const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return isMobile;
};

const SaveIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/>
    <polyline points="17 21 17 13 7 13 7 21"/>
    <polyline points="7 3 7 8 15 8"/>
  </svg>
);

const DownloadIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
    <polyline points="7 10 12 15 17 10"/>
    <line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
);

const SectionHeader = ({ title }) => (
  <div style={secHdr}>
    <span style={{ width:6, height:6, background:C.orange, borderRadius:'50%', display:'inline-block' }}></span>
    <span style={secTtl}>{title}</span>
  </div>
);

export default function WorkOrderFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const isMobile = useIsMobile();
  const [clients, setClients] = useState([]);
  const [saving, setSaving] = useState(false);
  const [orderNumber, setOrderNumber] = useState('—');
  const [form, setForm] = useState({
    client_id:'', received_at:new Date().toISOString().slice(0,10),
    delivery_at:'', authorized_by:'', project:'', status:'recibido',
    equipment_name:'', brand:'', model:'', serial:'',
    kw:'', voltage:'', amperage:'', rpm:'', hp:'', frame:'',
    work_type:'', observations:'', internal_notes:'',
    quotation_number:'', dte_number:'', oc_number:'',
    tech_disarm:'', tech_assemble:'', total:'',
  });
  const [items, setItems] = useState(DEFAULT_ITEMS.map(n => ({ name:n, quantity:1, has_item:false })));

  useEffect(() => {
    clientsApi.list().then(setClients);
    if (isEdit) {
      workOrdersApi.get(id).then(order => {
        const { items:oi, ...rest } = order;
        setOrderNumber(rest.number || '—');
        setForm(f => ({ ...f, ...rest,
          received_at: rest.received_at?.slice(0,10) || '',
          delivery_at: rest.delivery_at?.slice(0,10) || '',
        }));
        if (oi?.length) setItems(oi);
      });
    }
  }, [id]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const toggleItem = (i) => setItems(p => p.map((it, idx) => idx === i ? { ...it, has_item: !it.has_item } : it));

  const handleSubmit = async () => {
    if (!form.client_id) return alert('Selecciona un cliente');
    setSaving(true);
    try {
      if (isEdit) await workOrdersApi.update(id, { ...form, items });
      else await workOrdersApi.create({ ...form, items });
      navigate('/ordenes');
    } catch(e) { alert(e.response?.data?.message || e.response?.data?.error || e.message || 'Error al guardar'); }
    finally { setSaving(false); }
  };

  const handleDownloadPDF = async () => {
    if (!id) return alert('Guarda la orden primero');
    try {
      const token = getToken();
      const res = await fetch(`/api/work-orders/${id}/pdf`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `orden-${orderNumber}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch(e) { alert('Error al generar PDF'); }
  };

  const statusColor = STATUS_COLORS[form.status] || '#1D9E75';
  const statusLabel = STATUS_OPTIONS.find(s => s.value === form.status)?.label || 'Recibido';

  return (
    <div style={{ background:C.bg, minHeight:'100vh', margin:'-24px', padding:0 }}>

      {/* Topbar */}
      <div style={{ background:C.card, borderBottom:'1px solid '+C.border, padding:'10px 16px', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:8 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
          <button onClick={() => navigate('/ordenes')} style={{ background:C.dark, border:'1px solid '+C.border, color:'#93a8c8', padding:'6px 12px', borderRadius:6, cursor:'pointer', fontSize:12 }}>
            ← Volver
          </button>
          <span style={{ fontSize:isMobile?13:15, fontWeight:700, color:C.text }}>{isEdit ? 'Editar Orden' : 'Nueva Orden de Trabajo'}</span>
          {isEdit && <span style={{ background:C.orange+'22', border:'1px solid '+C.orange+'66', color:C.orange, padding:'3px 10px', borderRadius:4, fontSize:11, fontWeight:700 }}>No. {orderNumber}</span>}
          <span style={{ background:statusColor+'22', border:'1px solid '+statusColor+'44', color:statusColor, padding:'3px 10px', borderRadius:4, fontSize:11, fontWeight:700, display:'flex', alignItems:'center', gap:5 }}>
            <span style={{ width:6, height:6, background:statusColor, borderRadius:'50%', display:'inline-block' }}></span>
            {statusLabel}
          </span>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          {isEdit && (
            <button onClick={handleDownloadPDF} style={{ background:'#10b981', border:'none', color:'#fff', padding:'8px 16px', borderRadius:6, fontWeight:700, fontSize:13, cursor:'pointer', display:'flex', alignItems:'center', gap:7 }}>
              <DownloadIcon /> PDF
            </button>
          )}
          <button onClick={handleSubmit} disabled={saving} style={{ background:C.orange, border:'none', color:'#fff', padding:'8px 18px', borderRadius:6, fontWeight:700, fontSize:13, cursor:'pointer', display:'flex', alignItems:'center', gap:7, opacity:saving?0.7:1 }}>
            <SaveIcon /> {saving ? 'Guardando...' : 'Guardar Orden'}
          </button>
        </div>
      </div>

      {/* Botón guardar sticky en móvil */}
      {isMobile && (
        <div style={{ position:'sticky', top:0, zIndex:100, padding:'8px 16px', background:C.bg, borderBottom:'1px solid '+C.border }}>
          <div style={{ display:'flex', gap:8 }}>
            {isEdit && (
              <button onClick={handleDownloadPDF} style={{ background:'#10b981', border:'none', color:'#fff', padding:'10px 14px', borderRadius:6, fontWeight:700, fontSize:13, cursor:'pointer', display:'flex', alignItems:'center', gap:7 }}>
                <DownloadIcon /> PDF
              </button>
            )}
            <button onClick={handleSubmit} disabled={saving} style={{ background:C.orange, border:'none', color:'#fff', padding:'10px', borderRadius:6, fontWeight:700, fontSize:13, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:7, flex:1, opacity:saving?0.7:1 }}>
              <SaveIcon /> {saving ? 'Guardando...' : 'Guardar Orden'}
            </button>
          </div>
        </div>
      )}

      <div style={{ padding: isMobile ? '12px' : '16px 20px', maxWidth:960, margin:'0 auto' }}>

        {/* Info general */}
        <div style={sec}>
          <SectionHeader title="Informacion General" />
          <div style={secBody}>
            <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr 1fr 1fr 1fr', gap:10 }}>
              <div style={{ gridColumn:'span 2' }}>
                <label style={lbl}>Cliente *</label>
                <select value={form.client_id} onChange={e => set('client_id', e.target.value)} style={{ ...inp, cursor:'pointer' }}>
                  <option value=''>Seleccionar cliente...</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.full_name || c.first_name}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>Fecha Recibido *</label>
                <input type='date' value={form.received_at||''} onChange={e => set('received_at', e.target.value)} style={inp}
                  onClick={e => e.target.showPicker && e.target.showPicker()} />
              </div>
              <div>
                <label style={lbl}>Fecha Entrega</label>
                <input type='date' value={form.delivery_at||''} onChange={e => set('delivery_at', e.target.value)} style={inp}
                  onClick={e => e.target.showPicker && e.target.showPicker()} />
              </div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr 1fr 1fr 1fr', gap:10, marginTop:10 }}>
              <div><label style={lbl}>Autorizado por</label><input value={form.authorized_by||''} onChange={withUppercase(e => set('authorized_by', e.target.value))} style={inp} /></div>
              <div><label style={lbl}>Proyecto</label><input value={form.project||''} onChange={withUppercase(e => set('project', e.target.value))} style={inp} /></div>
              <div><label style={lbl}>No. Cotizacion</label><input value={form.quotation_number||''} onChange={withUppercase(e => set('quotation_number', e.target.value))} style={inp} /></div>
              <div>
                <label style={lbl}>Estado</label>
                <select value={form.status} onChange={e => set('status', e.target.value)} style={{ ...inp, cursor:'pointer' }}>
                  {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Datos del equipo */}
        <div style={sec}>
          <SectionHeader title="Datos del Equipo" />
          <div style={secBody}>
            <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr 1fr 1fr 1fr', gap:10 }}>
              <div style={{ gridColumn:'span 2' }}><label style={lbl}>Nombre del Equipo</label><input value={form.equipment_name||''} onChange={withUppercase(e => set('equipment_name', e.target.value))} style={inp} /></div>
              <div><label style={lbl}>Marca</label><input value={form.brand||''} onChange={withUppercase(e => set('brand', e.target.value))} style={inp} /></div>
              <div><label style={lbl}>Serie / Modelo</label><input value={form.serial||''} onChange={withUppercase(e => set('serial', e.target.value))} style={inp} /></div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr 1fr 1fr' : 'repeat(6,1fr)', gap:10, marginTop:10 }}>
              <div><label style={lbl}>KW</label><input type='number' value={form.kw||''} onChange={e => set('kw', e.target.value)} style={inp} /></div>
              <div><label style={lbl}>Voltaje</label><input value={form.voltage||''} onChange={withUppercase(e => set('voltage', e.target.value))} style={inp} /></div>
              <div><label style={lbl}>Amperaje</label><input value={form.amperage||''} onChange={withUppercase(e => set('amperage', e.target.value))} style={inp} /></div>
              <div><label style={lbl}>RPM</label><input type='number' value={form.rpm||''} onChange={e => set('rpm', e.target.value)} style={inp} /></div>
              <div><label style={lbl}>HP</label><input type='number' value={form.hp||''} onChange={e => set('hp', e.target.value)} style={inp} /></div>
              <div><label style={lbl}>Frame</label><input value={form.frame||''} onChange={withUppercase(e => set('frame', e.target.value))} style={inp} /></div>
            </div>
          </div>
        </div>

        {/* Trabajo + Partes */}
        <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap:12 }}>
          <div style={sec}>
            <SectionHeader title="Trabajo a Realizar" />
            <div style={secBody}>
              <div>
                <label style={lbl}>Tipo de Trabajo</label>
                <select value={form.work_type||''} onChange={e => set('work_type', e.target.value)} style={{ ...inp, cursor:'pointer' }}>
                  <option value=''>Seleccionar...</option>
                  {WORK_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginTop:10 }}>
                <div><label style={lbl}>DTE No.</label><input value={form.dte_number||''} onChange={withUppercase(e => set('dte_number', e.target.value))} style={inp} /></div>
                <div><label style={lbl}>O.C. No.</label><input value={form.oc_number||''} onChange={withUppercase(e => set('oc_number', e.target.value))} style={inp} /></div>
              </div>
              <div style={{ marginTop:10 }}>
                <label style={lbl}>Observaciones</label>
                <textarea value={form.observations||''} onChange={withUppercase(e => set('observations', e.target.value))} rows={3} style={{ ...inp, resize:'vertical' }} />
              </div>
              <div style={{ borderTop:'1px solid '+C.border, margin:'12px 0' }} />
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                <div><label style={lbl}>Tecnico Desarma</label><input value={form.tech_disarm||''} onChange={withUppercase(e => set('tech_disarm', e.target.value))} style={inp} /></div>
                <div><label style={lbl}>Tecnico Arma</label><input value={form.tech_assemble||''} onChange={withUppercase(e => set('tech_assemble', e.target.value))} style={inp} /></div>
              </div>
              <div style={{ background:C.input, border:'2px solid '+C.orange+'55', borderRadius:8, padding:'10px 14px', marginTop:10 }}>
                <label style={{ ...lbl, color:C.orange }}>Total (Q)</label>
                <input type='number' value={form.total||''} onChange={e => set('total', e.target.value)}
                  style={{ background:'transparent', border:'none', color:C.orange, fontSize:22, fontWeight:700, width:'100%', outline:'none' }} />
              </div>
            </div>
          </div>

          <div style={sec}>
            <SectionHeader title="Partes del Equipo" />
            <div style={secBody}>
              <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4,1fr)', gap:6 }}>
                {items.map((item, i) => (
                  <div key={i} onClick={() => toggleItem(i)}
                    style={{ background:item.has_item ? C.orange+'18' : C.dark, border:'1px solid '+(item.has_item ? C.orange+'55' : C.border), borderRadius:6, padding:'8px 10px', display:'flex', alignItems:'center', gap:6, cursor:'pointer' }}>
                    <div style={{ width:13, height:13, borderRadius:3, border:'1.5px solid '+(item.has_item ? C.orange : '#2a4070'), background:item.has_item ? C.orange : 'transparent', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
                      {item.has_item && <span style={{ color:'#fff', fontSize:8, fontWeight:900, lineHeight:1 }}>✓</span>}
                    </div>
                    <span style={{ fontSize:11, color:item.has_item ? C.text : 'var(--c-muted)', lineHeight:1.3 }}>{item.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div style={{ paddingBottom:32 }} />
      </div>
    </div>
  );
}