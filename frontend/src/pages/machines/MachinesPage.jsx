import { useState, useEffect } from 'react';
import { machinesApi } from '../../api/machinesApi.js';
import { clientsApi } from '../../api/clientsApi.js';
import { Wrench, Plus, Pencil, Trash2, Search } from 'lucide-react';
import Combobox from '../../components/ui/Combobox.jsx';
import ClientPicker from '../../components/clients/ClientPicker.jsx';
import Modal from '../../components/ui/Modal.jsx';
import Input from '../../components/ui/Input.jsx';
import Textarea from '../../components/ui/Textarea.jsx';
import Button from '../../components/ui/Button.jsx';

const C = { bg:'var(--c-app)', card:'var(--c-surface)', dark:'var(--c-surface-2)', border:'var(--c-line)', input:'var(--c-surface-2)', text:'var(--c-text)', muted:'var(--c-muted)', orange:'#CA8A04', red:'#ef4444' };
const inp = { width:'100%', background:C.input, border:'1px solid '+C.border, color:C.text, padding:'8px 10px', borderRadius:6, fontSize:12, boxSizing:'border-box', outline:'none' };

export default function MachinesPage() {
  const [machines, setMachines] = useState([]);
  const [clients, setClients] = useState([]);
  const [clientFilter, setClientFilter] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ client_id:'', name:'', brand:'', model:'', serial:'', kw:'', voltage:'', amperage:'', rpm:'', hp:'', location:'', notes:'' });
  useEffect(() => {
    clientsApi.list().then(setClients);
    loadMachines();
  }, []);
  const loadMachines = (cid) => {
    setLoading(true);
    machinesApi.list(cid).then(setMachines).finally(() => setLoading(false));
  };
  const filtered = machines.filter(m => (!search || m.name?.toLowerCase().includes(search.toLowerCase()) || m.brand?.toLowerCase().includes(search.toLowerCase()) || m.client_name?.toLowerCase().includes(search.toLowerCase())));
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const openNew = () => { setEditing(null); setForm({ client_id:'', name:'', brand:'', model:'', serial:'', kw:'', voltage:'', amperage:'', rpm:'', hp:'', location:'', notes:'' }); setShowForm(true); };
  const openEdit = (m) => { setEditing(m); setForm({ client_id:m.client_id, name:m.name||'', brand:m.brand||'', model:m.model||'', serial:m.serial||'', kw:m.kw||'', voltage:m.voltage||'', amperage:m.amperage||'', rpm:m.rpm||'', hp:m.hp||'', location:m.location||'', notes:m.notes||'' }); setShowForm(true); };
  const handleSave = async () => {
    if (!form.client_id || !form.name) return alert('Cliente y nombre son obligatorios');
    try {
      if (editing) await machinesApi.update(editing.id, form);
      else await machinesApi.create(form);
      setShowForm(false); loadMachines(clientFilter || undefined);
    } catch(e) { alert(e.response?.data?.message || 'Error al guardar'); }
  };
  const handleDelete = async (id) => {
    if (!confirm('Eliminar esta maquina?')) return;
    await machinesApi.remove(id); loadMachines(clientFilter || undefined);
  };
  return (
    <div style={{ padding:'16px', maxWidth:1100, margin:'0 auto' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12, marginBottom:20 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <Wrench size={24} color={C.orange} />
          <div>
            <h1 style={{ fontSize:20, fontWeight:700, margin:0, color:C.text }}>Catalogo de Maquinas</h1>
            <p style={{ fontSize:13, color:C.muted, margin:0 }}>{machines.length} maquinas registradas</p>
          </div>
        </div>
        <button onClick={openNew} style={{ display:'flex', alignItems:'center', gap:8, background:C.orange, color:'#fff', border:'none', borderRadius:8, padding:'10px 18px', fontWeight:700, cursor:'pointer', fontSize:14 }}>
          <Plus size={18} /> Nueva Maquina
        </button>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr auto', gap:10, marginBottom:16 }}>
        <div style={{ position:'relative' }}>
          <Search size={15} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:C.muted }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder='Buscar...' style={{ ...inp, paddingLeft:32 }} />
        </div>
        <Combobox
          value={clientFilter}
          onChange={v => { setClientFilter(v); loadMachines(v || undefined); }}
          options={[{ value:'', label:'Todos los clientes' }, ...clients.map(c => ({ value:c.id, label:c.full_name || c.first_name, keywords:`${c.full_name||''} ${c.nit||''} ${c.dpi||''}` }))]}
          searchable
          wrapperStyle={{ minWidth:200 }}
        />
      </div>
      {loading ? <p style={{ color:C.muted, textAlign:'center', marginTop:40 }}>Cargando...</p> : (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {filtered.length === 0 ? (
            <div style={{ textAlign:'center', marginTop:60, color:C.muted }}>
              <Wrench size={48} style={{ opacity:.3, marginBottom:12 }} />
              <p>No hay maquinas registradas</p>
            </div>
          ) : filtered.map(m => (
            <div key={m.id} style={{ background:C.card, border:'1px solid '+C.border, borderRadius:10, padding:'14px 16px', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:10 }}>
              <div style={{ flex:1, minWidth:200 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                  <span style={{ fontWeight:700, fontSize:15, color:C.text }}>{m.name}</span>
                  {m.brand && <span style={{ fontSize:12, color:C.muted }}>· {m.brand}</span>}
                </div>
                <p style={{ margin:0, fontSize:13, color:C.orange }}>{m.client_name}</p>
                <p style={{ margin:'2px 0 0', fontSize:12, color:C.muted }}>{[m.serial && 'S/N: '+m.serial, m.voltage && m.voltage+'V', m.kw && m.kw+'KW', m.rpm && m.rpm+'RPM'].filter(Boolean).join(' · ')}</p>
                {m.location && <p style={{ margin:'2px 0 0', fontSize:12, color:C.muted }}>Ubicacion: {m.location}</p>}
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <button onClick={() => openEdit(m)} style={{ background:C.dark, border:'1px solid '+C.border, borderRadius:7, padding:'7px 10px', cursor:'pointer', color:C.muted }}><Pencil size={15}/></button>
                <button onClick={() => handleDelete(m.id)} style={{ background:C.dark, border:'1px solid '+C.border, borderRadius:7, padding:'7px 10px', cursor:'pointer', color:C.red }}><Trash2 size={15}/></button>
              </div>
            </div>
          ))}
        </div>
      )}
      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editing ? 'Editar Maquina' : 'Nueva Maquina'}
        size="lg"
        accentColor={C.orange}
        footer={(
          <>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button variant="primary" onClick={handleSave}>Guardar</Button>
          </>
        )}
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-muted">Cliente *</label>
            <ClientPicker clients={clients} value={form.client_id} onChange={v => set('client_id', v)} />
          </div>
          <Input label="Nombre *" className="sm:col-span-2" value={form.name} onChange={e => set('name', e.target.value)} />
          <Input label="Marca" value={form.brand} onChange={e => set('brand', e.target.value)} />
          <Input label="Modelo" value={form.model} onChange={e => set('model', e.target.value)} />
          <Input label="Serie" value={form.serial} onChange={e => set('serial', e.target.value)} />
          <Input label="Ubicacion" value={form.location} onChange={e => set('location', e.target.value)} />
          <Input label="Potencia (KW)" type="number" value={form.kw} onChange={e => set('kw', e.target.value)} />
          <Input label="Potencia (HP)" type="number" value={form.hp} onChange={e => set('hp', e.target.value)} />
          <Input label="Voltaje" value={form.voltage} onChange={e => set('voltage', e.target.value)} />
          <Input label="Amperaje" value={form.amperage} onChange={e => set('amperage', e.target.value)} />
          <Input label="RPM" type="number" value={form.rpm} onChange={e => set('rpm', e.target.value)} />
          <Textarea label="Notas" className="sm:col-span-2" rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} />
        </div>
      </Modal>
    </div>
  );
}
