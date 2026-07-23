// PANTALLA: Alta / edición de una Orden de Servicio (trabajo subcontratado
// fuera del taller). A diferencia de Orden de Trabajo, aquí SÍ se muestran
// precios (costo acordado/real) — es informacion administrativa interna para
// Abdías, no algo que vea un técnico. El cliente y el equipo son opcionales
// (solo para trazabilidad, cuando el subcontrato viene de un trabajo de un
// cliente puntual).
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { serviceOrdersApi } from '../../api/serviceOrdersApi.js';
import { subcontractorsApi } from '../../api/subcontractorsApi.js';
import { clientsApi } from '../../api/clientsApi.js';
import { getToken } from '../../lib/authStorage.js';
import { withUppercase } from '../../lib/text.js';
import Combobox from '../../components/ui/Combobox.jsx';
import ClientPicker from '../../components/clients/ClientPicker.jsx';

const STATUS_OPTIONS = [
  { value:'enviada',    label:'Enviada' },
  { value:'en_proceso', label:'En Proceso' },
  { value:'recibida',   label:'Recibida' },
  { value:'cancelada',  label:'Cancelada' },
];
const STATUS_COLORS = { enviada:'#3b82f6', en_proceso:'#CA8A04', recibida:'#10b981', cancelada:'#ef4444' };
const C = { bg:'var(--c-app)', card:'var(--c-surface)', dark:'var(--c-surface-2)', border:'var(--c-line)', input:'var(--c-surface-2)', text:'var(--c-text)', muted:'var(--c-muted)', orange:'#CA8A04' };
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

export default function ServiceOrderFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const isMobile = useIsMobile();
  const [clients, setClients] = useState([]);
  const [subcontractors, setSubcontractors] = useState([]);
  const [saving, setSaving] = useState(false);
  const [orderNumber, setOrderNumber] = useState('—');
  const [form, setForm] = useState({
    subcontractor_id:'', client_id:'',
    equipment_name:'', brand:'', model:'', serial:'',
    description:'', sent_at:new Date().toISOString().slice(0,10),
    expected_return_at:'', received_at:'', status:'enviada',
    agreed_cost:'', actual_cost:'', notes:'',
  });

  useEffect(() => {
    clientsApi.list().then(setClients);
    subcontractorsApi.list().then(setSubcontractors);
    if (isEdit) {
      serviceOrdersApi.get(id).then(order => {
        setOrderNumber(order.number || '—');
        setForm(f => ({ ...f, ...order,
          sent_at: order.sent_at?.slice(0,10) || '',
          expected_return_at: order.expected_return_at?.slice(0,10) || '',
          received_at: order.received_at?.slice(0,10) || '',
        }));
      });
    }
  }, [id]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.subcontractor_id) return alert('Selecciona un subcontratista');
    if (!form.description) return alert('Describe el trabajo a subcontratar');
    setSaving(true);
    try {
      if (isEdit) await serviceOrdersApi.update(id, form);
      else await serviceOrdersApi.create(form);
      navigate('/ordenes-servicio');
    } catch(e) { alert(e.response?.data?.error || e.message || 'Error al guardar'); }
    finally { setSaving(false); }
  };

  const handleDownloadPDF = async () => {
    if (!id) return alert('Guarda la orden primero');
    try {
      const token = getToken();
      const res = await fetch(`/api/service-orders/${id}/pdf`, { headers: { Authorization: `Bearer ${token}` } });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `orden-servicio-${orderNumber}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch(e) { alert('Error al generar PDF'); }
  };

  const statusColor = STATUS_COLORS[form.status] || '#3b82f6';
  const statusLabel = STATUS_OPTIONS.find(s => s.value === form.status)?.label || 'Enviada';

  return (
    <div style={{ background:C.bg, minHeight:'100vh', margin:'-24px', padding:0 }}>
      <div style={{ background:C.card, borderBottom:'1px solid '+C.border, padding:'10px 16px', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:8 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
          <button onClick={() => navigate('/ordenes-servicio')} style={{ background:C.dark, border:'1px solid '+C.border, color:'#8fb3a0', padding:'6px 12px', borderRadius:6, cursor:'pointer', fontSize:12 }}>
            ← Volver
          </button>
          <span style={{ fontSize:isMobile?13:15, fontWeight:700, color:C.text }}>{isEdit ? 'Editar Orden de Servicio' : 'Nueva Orden de Servicio'}</span>
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

      <div style={{ padding: isMobile ? '12px' : '16px 20px', maxWidth:960, margin:'0 auto' }}>
        <div style={sec}>
          <SectionHeader title="Informacion General" />
          <div style={secBody}>
            <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap:10 }}>
              <div>
                <label style={lbl}>Subcontratista *</label>
                <Combobox
                  value={form.subcontractor_id}
                  onChange={v => set('subcontractor_id', v)}
                  options={subcontractors.map(s => ({ value:s.id, label:s.name }))}
                  placeholder="Seleccionar..."
                  searchable
                />
              </div>
              <div>
                <label style={lbl}>Cliente relacionado (opcional)</label>
                <ClientPicker clients={clients} value={form.client_id} onChange={v => set('client_id', v)} />
              </div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr 1fr 1fr', gap:10, marginTop:10 }}>
              <div>
                <label style={lbl}>Fecha Enviado *</label>
                <input type='date' value={form.sent_at||''} onChange={e => set('sent_at', e.target.value)} style={inp}
                  onClick={e => e.target.showPicker && e.target.showPicker()} />
              </div>
              <div>
                <label style={lbl}>Retorno Esperado</label>
                <input type='date' value={form.expected_return_at||''} onChange={e => set('expected_return_at', e.target.value)} style={inp}
                  onClick={e => e.target.showPicker && e.target.showPicker()} />
              </div>
              <div>
                <label style={lbl}>Fecha Recibido</label>
                <input type='date' value={form.received_at||''} onChange={e => set('received_at', e.target.value)} style={inp}
                  onClick={e => e.target.showPicker && e.target.showPicker()} />
              </div>
            </div>
            <div style={{ marginTop:10 }}>
              <label style={lbl}>Estado</label>
              <Combobox value={form.status} onChange={v => set('status', v)} options={STATUS_OPTIONS} style={{ maxWidth:220 }} />
            </div>
          </div>
        </div>

        <div style={sec}>
          <SectionHeader title="Equipo de Origen (opcional)" />
          <div style={secBody}>
            <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr 1fr 1fr 1fr', gap:10 }}>
              <div style={{ gridColumn:'span 2' }}><label style={lbl}>Nombre del Equipo</label><input value={form.equipment_name||''} onChange={withUppercase(e => set('equipment_name', e.target.value))} style={inp} /></div>
              <div><label style={lbl}>Marca</label><input value={form.brand||''} onChange={withUppercase(e => set('brand', e.target.value))} style={inp} /></div>
              <div><label style={lbl}>Serie / Modelo</label><input value={form.serial||''} onChange={withUppercase(e => set('serial', e.target.value))} style={inp} /></div>
            </div>
          </div>
        </div>

        <div style={sec}>
          <SectionHeader title="Trabajo Subcontratado" />
          <div style={secBody}>
            <div>
              <label style={lbl}>Descripcion *</label>
              <textarea value={form.description||''} onChange={withUppercase(e => set('description', e.target.value))} rows={3} style={{ ...inp, resize:'vertical' }} />
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginTop:10 }}>
              <div><label style={lbl}>Costo Acordado (Q)</label><input type='number' step='0.01' value={form.agreed_cost||''} onChange={e => set('agreed_cost', e.target.value)} style={inp} /></div>
              <div><label style={lbl}>Costo Real (Q)</label><input type='number' step='0.01' value={form.actual_cost||''} onChange={e => set('actual_cost', e.target.value)} style={inp} /></div>
            </div>
            <div style={{ marginTop:10 }}>
              <label style={lbl}>Notas</label>
              <textarea value={form.notes||''} onChange={e => set('notes', e.target.value)} rows={2} style={{ ...inp, resize:'vertical' }} />
            </div>
          </div>
        </div>
        <div style={{ paddingBottom:32 }} />
      </div>
    </div>
  );
}
