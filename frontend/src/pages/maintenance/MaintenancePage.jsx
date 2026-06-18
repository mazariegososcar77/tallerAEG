import { useState, useEffect } from 'react';
import { maintenanceApi } from '../../api/maintenanceApi.js';
import { machinesApi } from '../../api/machinesApi.js';
import { clientsApi } from '../../api/clientsApi.js';
import { Calendar, Plus, Pencil, Trash2, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import Modal from '../../components/ui/Modal.jsx';
import Select from '../../components/ui/Select.jsx';
import Input from '../../components/ui/Input.jsx';
import Textarea from '../../components/ui/Textarea.jsx';
import DatePicker from '../../components/ui/DatePicker.jsx';
import Button from '../../components/ui/Button.jsx';

const C = { bg:'var(--c-app)', card:'var(--c-surface)', dark:'var(--c-surface-2)', border:'var(--c-line)', input:'var(--c-surface-2)', text:'var(--c-text)', muted:'var(--c-muted)', orange:'#E8551C', green:'#1D9E75', red:'#ef4444', amber:'#f59e0b' };
const STATUS = { al_dia:{ label:'Al dia', color:'#1D9E75', Icon:CheckCircle }, proximo:{ label:'Proximo', color:'#f59e0b', Icon:Clock }, vencido:{ label:'Vencido', color:'#ef4444', Icon:AlertTriangle } };
const FREQ = { mensual:'Mensual', trimestral:'Trimestral', semestral:'Semestral', anual:'Anual', personalizado:'Personalizado' };
const FREQ_OPTIONS = [
  { value:'trimestral',    label:'Trimestral (90 dias)' },
  { value:'semestral',     label:'Semestral (180 dias)' },
  { value:'anual',         label:'Anual (365 dias)' },
  { value:'mensual',       label:'Mensual (30 dias)' },
  { value:'personalizado', label:'Personalizado' },
];

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
      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editing ? 'Editar Mantenimiento' : 'Nuevo Mantenimiento'}
        size="md"
        accentColor={C.orange}
        footer={(
          <>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button variant="primary" onClick={handleSave}>Guardar</Button>
          </>
        )}
      >
        <div style={{ display:'grid', gap:14 }}>
          <Select
            label="Cliente *"
            value={form.client_id}
            onChange={v => { set('client_id', v); set('machine_id', ''); }}
            placeholder="Seleccionar cliente..."
            options={clients.map(c => ({ value: c.id, label: c.full_name || c.first_name }))}
          />
          <Select
            label="Maquina *"
            value={form.machine_id}
            onChange={v => set('machine_id', v)}
            placeholder={form.client_id ? 'Seleccionar maquina...' : 'Seleccione un cliente primero'}
            disabled={!form.client_id}
            options={clientMachines.map(m => ({ value: m.id, label: m.name + (m.brand ? ' - ' + m.brand : '') }))}
          />
          <Select
            label="Frecuencia"
            value={form.frequency}
            onChange={v => set('frequency', v)}
            options={FREQ_OPTIONS}
          />
          {form.frequency === 'personalizado' && (
            <Input
              label="Cada cuantos dias"
              type="number"
              min="1"
              value={form.frequency_days}
              onChange={e => set('frequency_days', e.target.value)}
            />
          )}
          <DatePicker
            label="Ultimo Servicio"
            value={form.last_service}
            onChange={v => set('last_service', v)}
          />
          <Textarea
            label="Descripcion"
            rows={2}
            value={form.description}
            onChange={e => set('description', e.target.value)}
          />
        </div>
      </Modal>
    </div>
  );
}
