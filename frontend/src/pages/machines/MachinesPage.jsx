import { useState, useEffect } from 'react';
import { machinesApi } from '../../api/machinesApi.js';
import { clientsApi } from '../../api/clientsApi.js';
import { Wrench, Plus, Pencil, Trash2, Search } from 'lucide-react';

const C = { bg:'#0C1733', card:'#16285C', dark:'#112048', border:'#1F3470', input:'#0C1733', text:'#e2e8f0', muted:'#5a7aa8', orange:'#E8551C', red:'#ef4444' };
const inp = { width:'100%', background:C.input, border:'1px solid '+C.border, color:C.text, padding:'8px 10px', borderRadius:6, fontSize:12, boxSizing:'border-box', outline:'none' };
const lbl = { display:'block', fontSize:10, fontWeight:800, color:C.muted, textTransform:'uppercase', letterSpacing:'.6px', marginBottom:5 };

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
        <select value={clientFilter} onChange={e => { setClientFilter(e.target.value); loadMachines(e.target.value || undefined); }} style={{ ...inp, width:'auto', minWidth:200, cursor:'pointer' }}>
          <option value=''>Todos los clientes</option>
          {clients.map(c => <option key={c.id} value={c.id}>{c.full_name || c.first_name}</option>)}
        </select>
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
      {showForm && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.6)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:50, padding:16 }}>
          <div style={{ background:C.card, border:'1px solid '+C.border, borderRadius:12, padding:24, width:'100%', maxWidth:640, maxHeight:'90vh', overflowY:'auto' }}>
            <h2 style={{ fontSize:16, fontWeight:700, color:C.text, marginBottom:20 }}>{editing ? 'Editar Maquina' : 'Nueva Maquina'}</h2>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <div style={{ gridColumn:'span 2' }}><label style={lbl}>Cliente *</label><select value={form.client_id} onChange={e => set('client_id', e.target.value)} style={{ ...inp, cursor:'pointer' }}><option value=''>Seleccionar...</option>{clients.map(c => <option key={c.id} value={c.id}>{c.full_name || c.first_name}</option>)}</select></div>
              <div style={{ gridColumn:'span 2' }}><label style={lbl}>Nombre *</label><input value={form.name} onChange={e => set('name', e.target.value)} style={inp} /></div>
              <div><label style={lbl}>Marca</label><input value={form.brand} onChange={e => set('brand', e.target.value)} style={inp} /></div>
              <div><label style={lbl}>Modelo</label><input value={form.model} onChange={e => set('model', e.target.value)} style={inp} /></div>
              <div><label style={lbl}>Serie</label><input value={form.serial} onChange={e => set('serial', e.target.value)} style={inp} /></div>
              <div><label style={lbl}>Ubicacion</label><input value={form.location} onChange={e => set('location', e.target.value)} style={inp} /></div>
              <div><label style={lbl}>KW</label><input type='number' value={form.kw} onChange={e => set('kw', e.target.value)} style={inp} /></div>
              <div><label style={lbl}>Voltaje</label><input value={form.voltage} onChange={e => set('voltage', e.target.value)} style={inp} /></div>
              <div><label style={lbl}>Amperaje</label><input value={form.amperage} onChange={e => set('amperage', e.target.value)} style={inp} /></div>
              <div><label style={lbl}>RPM</label><input type='number' value={form.rpm} onChange={e => set('rpm', e.target.value)} style={inp} /></div>
              <div style={{ gridColumn:'span 2' }}><label style={lbl}>Notas</label><textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} style={{ ...inp, resize:'vertical' }} /></div>
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
