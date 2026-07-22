// PANTALLA: Catálogo de Máquinas. Aquí se llevan registradas las máquinas
// (motores eléctricos) que tiene cada cliente, con sus datos técnicos (marca,
// modelo, serie, voltaje, KW, RPM, etc.). Se puede buscar, filtrar por cliente,
// crear una máquina nueva, editarla o eliminarla. Este catálogo es la base para
// el calendario de mantenimientos (pantalla "Mantenimientos").
import { useState, useEffect } from 'react';
import { machinesApi } from '../../api/machinesApi.js';
import { clientsApi } from '../../api/clientsApi.js';
import { Wrench, Plus, Pencil, Trash2, Search } from 'lucide-react';
import { withUppercase } from '../../lib/text.js';
import Combobox from '../../components/ui/Combobox.jsx';
import ClientPicker from '../../components/clients/ClientPicker.jsx';

const C = { bg:'var(--c-app)', card:'var(--c-surface)', dark:'var(--c-surface-2)', border:'var(--c-line)', input:'var(--c-surface-2)', text:'var(--c-text)', muted:'var(--c-muted)', orange:'#E8551C', red:'#ef4444' };
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
  // Al abrir la pantalla, carga la lista de clientes (para el filtro y el formulario)
  // y la lista de maquinas.
  useEffect(() => {
    clientsApi.list().then(setClients);
    loadMachines();
  }, []);
  // Trae del servidor las maquinas; si se le pasa un cliente, solo trae las de ese cliente.
  const loadMachines = (cid) => {
    setLoading(true);
    machinesApi.list(cid).then(setMachines).finally(() => setLoading(false));
  };
  // Filtra la lista de maquinas segun lo que el usuario escribio en el buscador
  // (busca en nombre, marca o cliente).
  const filtered = machines.filter(m => (!search || m.name?.toLowerCase().includes(search.toLowerCase()) || m.brand?.toLowerCase().includes(search.toLowerCase()) || m.client_name?.toLowerCase().includes(search.toLowerCase())));
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  // Abre el formulario vacio para registrar una maquina nueva.
  const openNew = () => { setEditing(null); setForm({ client_id:'', name:'', brand:'', model:'', serial:'', kw:'', voltage:'', amperage:'', rpm:'', hp:'', location:'', notes:'' }); setShowForm(true); };
  // Abre el formulario ya lleno con los datos de la maquina que se quiere editar.
  const openEdit = (m) => { setEditing(m); setForm({ client_id:m.client_id, name:m.name||'', brand:m.brand||'', model:m.model||'', serial:m.serial||'', kw:m.kw||'', voltage:m.voltage||'', amperage:m.amperage||'', rpm:m.rpm||'', hp:m.hp||'', location:m.location||'', notes:m.notes||'' }); setShowForm(true); };
  // Guarda la maquina (nueva o editada). Exige que tenga cliente y nombre como minimo.
  const handleSave = async () => {
    if (!form.client_id || !form.name) return alert('Cliente y nombre son obligatorios');
    try {
      if (editing) await machinesApi.update(editing.id, form);
      else await machinesApi.create(form);
      setShowForm(false); loadMachines(clientFilter || undefined);
    } catch(e) { alert(e.response?.data?.message || 'Error al guardar'); }
  };
  // Elimina una maquina, pidiendo confirmacion antes.
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
      {/* Ventana emergente con el formulario para crear o editar una maquina */}
      {showForm && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.6)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:50, padding:16 }}>
          <div style={{ background:C.card, border:'1px solid '+C.border, borderRadius:12, padding:24, width:'100%', maxWidth:640, maxHeight:'90vh', overflowY:'auto' }}>
            <h2 style={{ fontSize:16, fontWeight:700, color:C.text, marginBottom:20 }}>{editing ? 'Editar Maquina' : 'Nueva Maquina'}</h2>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <div style={{ gridColumn:'span 2' }}><label style={lbl}>Cliente *</label><ClientPicker clients={clients} value={form.client_id} onChange={v => set('client_id', v)} /></div>
              <div style={{ gridColumn:'span 2' }}><label style={lbl}>Nombre *</label><input value={form.name} onChange={withUppercase(e => set('name', e.target.value))} style={inp} /></div>
              <div><label style={lbl}>Marca</label><input value={form.brand} onChange={withUppercase(e => set('brand', e.target.value))} style={inp} /></div>
              <div><label style={lbl}>Modelo</label><input value={form.model} onChange={withUppercase(e => set('model', e.target.value))} style={inp} /></div>
              <div><label style={lbl}>Serie</label><input value={form.serial} onChange={withUppercase(e => set('serial', e.target.value))} style={inp} /></div>
              <div><label style={lbl}>Ubicacion</label><input value={form.location} onChange={withUppercase(e => set('location', e.target.value))} style={inp} /></div>
              <div><label style={lbl}>KW</label><input type='number' value={form.kw} onChange={e => set('kw', e.target.value)} style={inp} /></div>
              <div><label style={lbl}>Voltaje</label><input value={form.voltage} onChange={withUppercase(e => set('voltage', e.target.value))} style={inp} /></div>
              <div><label style={lbl}>Amperaje</label><input value={form.amperage} onChange={withUppercase(e => set('amperage', e.target.value))} style={inp} /></div>
              <div><label style={lbl}>RPM</label><input type='number' value={form.rpm} onChange={e => set('rpm', e.target.value)} style={inp} /></div>
              <div style={{ gridColumn:'span 2' }}><label style={lbl}>Notas</label><textarea value={form.notes} onChange={withUppercase(e => set('notes', e.target.value))} rows={2} style={{ ...inp, resize:'vertical' }} /></div>
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
