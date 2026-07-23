// ============================================================================
// PANTALLA: Configuración → Subcontratistas
// Administra el catálogo de terceros externos a los que el taller les manda
// trabajos afuera (ej. torneado) — se eligen desde el formulario de Orden de
// Servicio. Permite crear, editar y eliminar. Es una pantalla propia (no usa
// el componente genérico CatalogManager) porque sus campos (contacto,
// teléfono, correo) no calzan con ese componente — mismo criterio que ya se
// usó para Fidelización (LoyaltyTiersPage).
// ============================================================================
import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, Truck } from 'lucide-react';
import { subcontractorsApi } from '../../api/subcontractorsApi.js';
import { useAuth } from '../../hooks/useAuth.js';
import { useIsMobile } from '../../hooks/useIsMobile.js';
import { notify } from '../../lib/toast.js';
import Modal from '../../components/ui/Modal.jsx';
import Input from '../../components/ui/Input.jsx';
import Checkbox from '../../components/ui/Checkbox.jsx';
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx';

const C = { card:'var(--c-surface)', dark:'var(--c-surface-2)', border:'var(--c-line)', text:'var(--c-text)', muted:'var(--c-muted)', orange:'#CA8A04' };
const emptyForm = { name:'', contact_name:'', phone:'', email:'', is_active:true };

export default function SubcontractorsPage() {
  const { hasPermission } = useAuth();
  const isMobile = useIsMobile();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const reload = useCallback(() => {
    setLoading(true);
    subcontractorsApi.list().then(setItems).finally(() => setLoading(false));
  }, []);

  useEffect(() => { reload(); }, [reload]);

  useEffect(() => {
    if (!formOpen) return;
    setForm(editing
      ? { name:editing.name, contact_name:editing.contact_name||'', phone:editing.phone||'', email:editing.email||'', is_active:Boolean(editing.is_active) }
      : emptyForm);
  }, [formOpen, editing]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) { await subcontractorsApi.update(editing.id, form); notify.success('Subcontratista actualizado'); }
      else { await subcontractorsApi.create(form); notify.success('Subcontratista creado'); }
      setFormOpen(false); reload();
    } catch(err) { notify.error(err.response?.data?.error || err.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    try {
      await subcontractorsApi.remove(deleting.id);
      notify.success('Subcontratista eliminado');
      setDeleting(null); reload();
    } catch(err) { notify.error(err.response?.data?.error || err.message); }
  };

  return (
    <div style={{ padding:'20px 16px', maxWidth:900, margin:'0 auto' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12, marginBottom:20 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <Truck size={26} color="#CA8A04" />
          <div>
            <h1 style={{ fontSize:20, fontWeight:700, margin:0, color:C.text }}>Subcontratistas</h1>
            <p style={{ fontSize:13, color:C.muted, margin:0 }}>Terceros externos a los que se les manda trabajo afuera del taller</p>
          </div>
        </div>
        {hasPermission('subcontractors.create') && (
          <button onClick={() => { setEditing(null); setFormOpen(true); }} style={{ display:'flex', alignItems:'center', gap:6, background:C.orange, color:'#fff', border:'none', borderRadius:8, padding:'9px 16px', fontWeight:600, cursor:'pointer', fontSize:13 }}>
            <Plus size={16} /> Nuevo subcontratista
          </button>
        )}
      </div>
      <div style={{ background:C.card, border:'1px solid '+C.border, borderRadius:12, overflow:'hidden' }}>
        {!isMobile && (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 100px 90px', background:C.dark, padding:'10px 16px', borderBottom:'1px solid '+C.border }}>
            {['Nombre','Contacto','Telefono / Correo','Estado','Acciones'].map((h,i) => (
              <span key={i} style={{ fontSize:11, fontWeight:800, color:C.muted, textTransform:'uppercase', letterSpacing:'.6px', textAlign:i===4?'right':'left' }}>{h}</span>
            ))}
          </div>
        )}
        {loading ? <p style={{ color:C.muted, textAlign:'center', padding:40 }}>Cargando...</p>
        : items.length === 0 ? <div style={{ textAlign:'center', padding:'48px 0', color:C.muted }}><p>No hay subcontratistas registrados.</p></div>
        : isMobile ? items.map(s => (
          <div key={s.id} style={{ padding:'14px 16px', borderBottom:'1px solid '+C.border }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:10 }}>
              <div style={{ flex:1, minWidth:0 }}>
                <p style={{ margin:0, fontWeight:700, color:C.text }}>{s.name}</p>
                <p style={{ margin:'4px 0 0', fontSize:12, color:C.muted }}>{s.contact_name || '—'}</p>
                <p style={{ margin:'2px 0 0', fontSize:12, color:C.muted }}>{[s.phone, s.email].filter(Boolean).join(' · ') || '—'}</p>
                <span style={{ display:'inline-block', marginTop:6, background:s.is_active?'#10b98122':'#ef444422', color:s.is_active?'#10b981':'#ef4444', border:'1px solid '+(s.is_active?'#10b98144':'#ef444444'), borderRadius:20, padding:'2px 8px', fontSize:11, fontWeight:600 }}>
                  {s.is_active ? 'Activo' : 'Inactivo'}
                </span>
              </div>
              <div style={{ display:'flex', gap:6 }}>
                {hasPermission('subcontractors.update') && <button onClick={() => { setEditing(s); setFormOpen(true); }} title="Editar" style={{ background:C.dark, border:'1px solid '+C.border, borderRadius:6, padding:'8px 10px', cursor:'pointer', color:C.muted }}><Pencil size={15}/></button>}
                {hasPermission('subcontractors.delete') && <button onClick={() => setDeleting(s)} title="Eliminar" style={{ background:'#ef444415', border:'1px solid #ef444440', borderRadius:6, padding:'8px 10px', cursor:'pointer', color:'#ef4444' }}><Trash2 size={15}/></button>}
              </div>
            </div>
          </div>
        )) : items.map(s => (
          <div key={s.id} style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 100px 90px', padding:'12px 16px', borderBottom:'1px solid '+C.border, alignItems:'center' }}>
            <span style={{ fontWeight:600, color:C.text }}>{s.name}</span>
            <span style={{ fontSize:13, color:C.muted }}>{s.contact_name || '—'}</span>
            <span style={{ fontSize:13, color:C.muted }}>{[s.phone, s.email].filter(Boolean).join(' · ') || '—'}</span>
            <span style={{ background:s.is_active?'#10b98122':'#ef444422', color:s.is_active?'#10b981':'#ef4444', border:'1px solid '+(s.is_active?'#10b98144':'#ef444444'), borderRadius:20, padding:'2px 8px', fontSize:11, fontWeight:600, width:'fit-content' }}>
              {s.is_active ? 'Activo' : 'Inactivo'}
            </span>
            <div style={{ display:'flex', gap:6, justifyContent:'flex-end' }}>
              {hasPermission('subcontractors.update') && <button onClick={() => { setEditing(s); setFormOpen(true); }} title="Editar" style={{ background:C.dark, border:'1px solid '+C.border, borderRadius:6, padding:'5px 8px', cursor:'pointer', color:C.muted }}><Pencil size={14}/></button>}
              {hasPermission('subcontractors.delete') && <button onClick={() => setDeleting(s)} title="Eliminar" style={{ background:'#ef444415', border:'1px solid #ef444440', borderRadius:6, padding:'5px 8px', cursor:'pointer', color:'#ef4444' }}><Trash2 size={14}/></button>}
            </div>
          </div>
        ))}
      </div>
      <Modal open={formOpen} onClose={saving?undefined:()=>setFormOpen(false)} title={editing?'Editar subcontratista':'Nuevo subcontratista'}
        footer={
          <>
            <button onClick={()=>setFormOpen(false)} disabled={saving} style={{ background:C.dark, border:'1px solid '+C.border, borderRadius:7, padding:'8px 16px', color:C.text, cursor:'pointer' }}>Cancelar</button>
            <button type="submit" form="subcontractor-form" disabled={saving} style={{ background:C.orange, border:'none', borderRadius:7, padding:'8px 18px', color:'#fff', fontWeight:700, cursor:'pointer' }}>{editing?'Guardar':'Crear'}</button>
          </>
        }>
        <form id="subcontractor-form" onSubmit={handleSubmit} className="space-y-4">
          <Input label="Nombre" value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} required />
          <Input label="Persona de contacto" value={form.contact_name} onChange={e=>setForm(p=>({...p,contact_name:e.target.value}))} />
          <Input label="Telefono" value={form.phone} onChange={e=>setForm(p=>({...p,phone:e.target.value}))} />
          <Input label="Correo" type="email" value={form.email} onChange={e=>setForm(p=>({...p,email:e.target.value}))} />
          <Checkbox label="Activo" checked={form.is_active} onChange={checked=>setForm(p=>({...p,is_active:checked}))} />
        </form>
      </Modal>
      <ConfirmDialog open={Boolean(deleting)} onClose={()=>setDeleting(null)} onConfirm={handleDelete}
        title="Eliminar subcontratista" message={`Se eliminara "${deleting?.name}". Esta accion no se puede deshacer.`} confirmText="Eliminar" />
    </div>
  );
}
