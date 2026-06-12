import { useState, useEffect } from 'react';
import { maintenanceApi } from '../../api/maintenanceApi.js';
import { machinesApi } from '../../api/machinesApi.js';
import { clientsApi } from '../../api/clientsApi.js';
import { Calendar, Plus, Pencil, Trash2, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

const C = { bg:'#0C1733', card:'#16285C', dark:'#112048', border:'#1F3470', input:'#0C1733', text:'#e2e8f0', muted:'#5a7aa8', orange:'#E8551C', green:'#1D9E75', red:'#ef4444', amber:'#f59e0b' };
const inp = { width:'100%', background:C.input, border:'1px solid '+C.border, color:C.text, padding:'8px 10px', borderRadius:6, fontSize:12, boxSizing:'border-box', outline:'none' };
const lbl = { display:'block', fontSize:10, fontWeight:800, color:C.muted, textTransform:'uppercase', letterSpacing:'.6px', marginBottom:5 };
const STATUS = { al_dia:{ label:'Al dia', color:'#1D9E75', Icon:CheckCircle }, proximo:{ label:'Proximo', color:'#f59e0b', Icon:Clock }, vencido:{ label:'Vencido', color:'#ef4444', Icon:AlertTriangle } };
const FREQ = { mensual:'Mensual', trimestral:'Trimestral', semestral:'Semestral', anual:'Anual', personalizado:'Personalizado' };

export default function MaintenancePage() {
  const [records, setRecords] = useState([]);
  const [machines, setMachines] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ client_id:'', machine_id:'', frequency:'semestral', frequency_days:'', last_service:'', description:'' });
  useEffect(() => {
    clientsApi.list().then(setClients);
    machinesApi.list().then(setMachines);
    maintenanceApi.list().then(setRecords).finally(() => setLoading(false));
  }, []);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const clientMachines = machines.filter(m => String(m.client_id) === String(form.client_id));
  const openNew = () => { setEditing(null); setForm({ client_id:'', machine_id:'', frequency:'semestral', frequency_days:'', last_service:'', description:'' }); setShowForm(true); };
  const openEdit = (r) => { setEditing(r); setForm({ client_id:r.client_id, machine_id:r.machine_id, frequency:r.frequency, frequency_days:r.frequency_days||'', last_service:r.last_service?.slice(0,10)||'', description:r.description||'' }); setShowForm(true); };
  const handleSave = async () => {
    if (!form.client_id || !form.machine_id) return alert('Cliente y maquina son obligatorios');
    try {
      if (editing) await maintenanceApi.update(editing.id, form);
      else await maintenanceApi.create(form);
      setShowForm(false); maintenanceApi.list().then(setRecords);
    } catch(e) { alert(e.response?.data?.message || 'Error al guardar'); }
  };
  const handleDelete = async (id) => {
    if (!confirm('Eliminar este mantenimiento?')) return;
    await maintenanceApi.remove(id); maintenanceApi.list().then(setRecords);
  };
  const vencidos = records.filter(r => r.status === 'vencido').length;
  const proximos = records.filter(r => r.status === 'proximo').length;
  return (
    <div style={{ padding:'16px', maxWidth:1100, margin:'0 auto' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12, marginBottom:16 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <Calendar size={24} color={C.orange} />
          <div>
            <h1 style={{ fontSize:20, fontWeight:700, margin:0, color:C.text }}>Calendario de Mantenimientos</h1>
            <p style={{ fontSize:13, color:C.muted, margin:0 }}>{records.length} mantenimientos programados</p>
          </div>
        </div>
        <button onClick={openNew} style={{ display:'flex', alignItems:'center', gap:8, background:C.orange, color:'#fff', border:'none', borderRadius:8, padding:'10px 18px', fontWeight:700, cursor:'pointer', fontSize:14 }}>
          <Plus size={18} /> Nuevo Mantenimiento
        </button>
      </div>
      {(vencidos > 0 || proximos > 0) && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:16 }}>
          {vencidos > 0 && <div style={{ background:'#ef444415', border:'1px solid #ef444440', borderRadius:10, padding:'12px 16px', display:'flex', alignItems:'center', gap:10 }}><AlertTriangle size={20} color='#ef4444' /><div><p style={{ margin:0, fontWeight:700, color:'#ef4444', fontSize:14 }}>{vencidos} vencido{vencidos>1?'s':''}</p><p style={{ margin:0, fontSize:12, color:C.muted }}>Requieren atencion inmediata</p></div></div>}
          {proximos > 0 && <div style={{ background:'#f59e0b15', border:'1px solid #f59e0b40', borderRadius:10, padding:'12px 16px', display:'flex', alignItems:'center', gap:10 }}><Clock size={20} color='#f59e0b' /><div><p style={{ margin:0, fontWeight:700, color:'#f59e0b', fontSize:14 }}>{proximos} proximo{proximos>1?'s':''}</p><p style={{ margin:0, fontSize:12, color:C.muted }}>Proximos 30 dias</p></div></div>}
        </div>
      )}
      {loading ? <p style={{ color:C.muted, textAlign:'center', marginTop:40 }}>Cargando...</p> : (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {records.length === 0 ? (
            <div style={{ textAlign:'center', marginTop:60, color:C.muted }}>
              <Calendar size={48} style={{ opacity:.3, marginBottom:12 }} />
              <p>No hay mantenimientos programados</p>
            </div>
          ) : records.map(r => {
            const st = STATUS[r.status] || STATUS.al_dia;
            const Icon = st.Icon;
            return (
              <div key={r.id} style={{ background:C.card, border:'1px solid '+(r.status==='vencido'?'#ef444440':r.status==='proximo'?'#f59e0b40':C.border), borderRadius:10, padding:'14px 16px', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:10 }}>
                <div style={{ flex:1, minWidth:200 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                    <Icon size={15} color={st.color} />
                    <span style={{ fontWeight:700, fontSize:15, color:C.text }}>{r.machine_name}</span>
                    <span style={{ background:st.color+'22', color:st.color, border:'1px solid '+st.color+'44', borderRadius:4, padding:'2px 8px', fontSize:11, fontWeight:700 }}>{st.label}</span>
                  </div>
                  <p style={{ margin:0, fontSize:13, color:C.orange }}>{r.client_name}</p>
                  <p style={{ margin:'2px 0 0', fontSize:12, color:C.muted }}>{FREQ[r.frequency]} · Ultimo: {r.last_service?.slice(0,10)||'No registrado'} · Proximo: <span style={{ color:r.status==='vencido'?'#ef4444':r.status==='proximo'?'#f59e0b':C.green, fontWeight:600 }}>{r.next_service?.slice(0,10)||'—'}</span></p>
                  {r.description && <p style={{ margin:'2px 0 0', fontSize:12, color:C.muted }}>{r.description}</p>}
                </div>
                <div style={{ display:'flex', gap:8 }}>
                  <button onClick={() => openEdit(r)} style={{ background:C.dark, border:'1px solid '+C.border, borderRadius:7, padding:'7px 10px', cursor:'pointer', color:C.muted }}><Pencil size={15}/></button>
                  <button onClick={() => handleDelete(r.id)} style={{ background:C.dark, border:'1px solid '+C.border, borderRadius:7, padding:'7px 10px', cursor:'pointer', color:C.red }}><Trash2 size={15}/></button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {showForm && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.6)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:50, padding:16 }}>
          <div style={{ background:C.card, border:'1px solid '+C.border, borderRadius:12, padding:24, width:'100%', maxWidth:520, maxHeight:'90vh', overflowY:'auto' }}>
            <h2 style={{ fontSize:16, fontWeight:700, color:C.text, marginBottom:20 }}>{editing ? 'Editar Mantenimiento' : 'Nuevo Mantenimiento'}</h2>
            <div style={{ display:'grid', gap:12 }}>
              <div><label style={lbl}>Cliente *</label><select value={form.client_id} onChange={e => { set('client_id', e.target.value); set('machine_id', ''); }} style={{ ...inp, cursor:'pointer' }}><option value=''>Seleccionar cliente...</option>{clients.map(c => <option key={c.id} value={c.id}>{c.full_name || c.first_name}</option>)}</select></div>
              <div><label style={lbl}>Maquina *</label><select value={form.machine_id} onChange={e => set('machine_id', e.target.value)} style={{ ...inp, cursor:'pointer' }} disabled={!form.client_id}><option value=''>Seleccionar maquina...</option>{clientMachines.map(m => <option key={m.id} value={m.id}>{m.name}{m.brand ? ' - '+m.brand : ''}</option>)}</select></div>
              <div><label style={lbl}>Frecuencia</label><select value={form.frequency} onChange={e => set('frequency', e.target.value)} style={{ ...inp, cursor:'pointer' }}><option value='trimestral'>Trimestral (90 dias)</option><option value='semestral'>Semestral (180 dias)</option><option value='anual'>Anual (365 dias)</option><option value='mensual'>Mensual (30 dias)</option><option value='personalizado'>Personalizado</option></select></div>
              {form.frequency === 'personalizado' && <div><label style={lbl}>Cada cuantos dias</label><input type='number' value={form.frequency_days} onChange={e => set('frequency_days', e.target.value)} style={inp} /></div>}
              <div><label style={lbl}>Ultimo Servicio</label><input type='date' value={form.last_service} onChange={e => set('last_service', e.target.value)} onClick={e => e.target.showPicker && e.target.showPicker()} style={inp} /></div>
              <div><label style={lbl}>Descripcion</label><textarea value={form.description} onChange={e => set('description', e.target.value)} rows={2} style={{ ...inp, resize:'vertical' }} /></div>
            </div>
            <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:16 }}>
              <button onClick={() => setShowForm(false)} style={{ background:C.dark, border:'1px solid '+C.border, borderRadius:7, padding:'9px 18px', color:C.text, cursor:'pointer' }}>Cancelar</button>
              <button onClick={handleSave} style={{ background:C.orange, border:'none', borderRadius:7, padding:'9px 20px', color:'#fff', fontWeight:700, cursor:'pointer' }}>Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
