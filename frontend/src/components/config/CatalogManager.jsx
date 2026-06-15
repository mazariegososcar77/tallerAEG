import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth.js';
import { notify } from '../../lib/toast.js';
import Modal from '../ui/Modal.jsx';
import Input from '../ui/Input.jsx';
import Checkbox from '../ui/Checkbox.jsx';
import ColorPicker from '../ui/ColorPicker.jsx';
import ConfirmDialog from '../ui/ConfirmDialog.jsx';
import { useIsMobile } from '../../hooks/useIsMobile.js';

const C = { card:"var(--c-surface)", dark:"var(--c-surface-2)", border:"var(--c-line)", input:"var(--c-surface-2)", text:"var(--c-text)", muted:"var(--c-muted)", orange:"#E8551C" };
const DEFAULT_COLOR = "#16285C";

export default function CatalogManager({ title, subtitle, emoji, entityLabel, items, loading, reload, api, permPrefix, withColor=false }) {
  const { hasPermission } = useAuth();
  const canCreate = hasPermission(`${permPrefix}.create`);
  const canUpdate = hasPermission(`${permPrefix}.update`);
  const canDelete = hasPermission(`${permPrefix}.delete`);
  const isMobile = useIsMobile();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [form, setForm] = useState({ name:"", description:"", color:DEFAULT_COLOR, is_active:true });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!formOpen) return;
    setErrors({});
    setForm(editing ? { name:editing.name, description:editing.description||"", color:editing.color||DEFAULT_COLOR, is_active:editing.is_active } : { name:"", description:"", color:DEFAULT_COLOR, is_active:true });
  }, [formOpen, editing]);

  const openCreate = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (item) => { setEditing(item); setFormOpen(true); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    const payload = { name:form.name, description:form.description, is_active:form.is_active };
    if (withColor) payload.color = form.color;
    try {
      if (editing) { await api.update(editing.id, payload); notify.success(`${entityLabel} actualizado`); }
      else { await api.create(payload); notify.success(`${entityLabel} creado`); }
      setFormOpen(false); reload();
    } catch(err) {
      if (err.details?.length) setErrors(Object.fromEntries(err.details.map(d => [d.field, d.message])));
      notify.error(err.message);
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    try {
      await api.remove(deleting.id);
      notify.success(`${entityLabel} eliminado`);
      setDeleting(null); reload();
    } catch(err) { notify.error(err.message); }
  };

  const cols = isMobile ? "1fr 80px" : (withColor ? "40px 1fr 1fr 100px 100px" : "1fr 1fr 100px 100px");
  const headers = isMobile ? ["Nombre","Acciones"] : [...(withColor?[""]:[]), "Nombre","Descripcion","Estado","Acciones"];

  return (
    <div style={{ padding:"20px 16px", maxWidth:900, margin:"0 auto" }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:12, marginBottom:20 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          {emoji && <span style={{ display:"flex" }}>{emoji}</span>}
          <div>
            <h1 style={{ fontSize:20, fontWeight:700, margin:0, color:C.text }}>{title}</h1>
            <p style={{ fontSize:13, color:C.muted, margin:0 }}>{subtitle}</p>
          </div>
        </div>
        {canCreate && (
          <button onClick={openCreate} style={{ display:"flex", alignItems:"center", gap:6, background:C.orange, color:"#fff", border:"none", borderRadius:8, padding:"9px 16px", fontWeight:600, cursor:"pointer", fontSize:13 }}>
            <Plus size={16} /> Nuevo
          </button>
        )}
      </div>
      <div style={{ background:C.card, border:"1px solid "+C.border, borderRadius:12, overflow:"hidden" }}>
        <div style={{ display:"grid", gridTemplateColumns:cols, background:C.dark, padding:"10px 16px", borderBottom:"1px solid "+C.border }}>
          {headers.map((h,i) => (
            <span key={i} style={{ fontSize:11, fontWeight:800, color:C.muted, textTransform:"uppercase", letterSpacing:".6px", textAlign:i===headers.length-1?"right":"left" }}>{h}</span>
          ))}
        </div>
        {loading ? <p style={{ color:C.muted, textAlign:"center", padding:40 }}>Cargando...</p>
        : items.length === 0 ? <div style={{ textAlign:"center", padding:"48px 0", color:C.muted }}><p>No hay registros.</p></div>
        : items.map(item => (
          <div key={item.id} style={{ display:"grid", gridTemplateColumns:cols, padding:"12px 16px", borderBottom:"1px solid "+C.border, alignItems:"center" }}>
            <div>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                {withColor && <span style={{ width:14, height:14, borderRadius:"50%", background:item.color||DEFAULT_COLOR, display:"inline-block", border:"1px solid "+C.border, flexShrink:0 }} />}
                <span style={{ fontWeight:600, color:C.text }}>{item.name}</span>
              </div>
              {isMobile && <p style={{ margin:"3px 0 0", fontSize:12, color:C.muted }}>{item.description || "—"} · {item.is_active ? "Activo" : "Inactivo"}</p>}
            </div>
            {!isMobile && <span style={{ fontSize:13, color:C.muted }}>{item.description || "—"}</span>}
            {!isMobile && <span style={{ background:item.is_active?"#10b98122":"#ef444422", color:item.is_active?"#10b981":"#ef4444", border:"1px solid "+(item.is_active?"#10b98144":"#ef444444"), borderRadius:20, padding:"2px 8px", fontSize:11, fontWeight:600, width:"fit-content" }}>
              {item.is_active ? "Activo" : "Inactivo"}
            </span>}
            <div style={{ display:"flex", gap:6, justifyContent:"flex-end" }}>
              {canUpdate && <button onClick={() => openEdit(item)} style={{ background:C.dark, border:"1px solid "+C.border, borderRadius:6, padding:"8px 10px", cursor:"pointer", color:C.muted }}><Pencil size={14}/></button>}
              {canDelete && <button onClick={() => setDeleting(item)} style={{ background:"#ef444415", border:"1px solid #ef444440", borderRadius:6, padding:"8px 10px", cursor:"pointer", color:"#ef4444"}}><Trash2 size={14}/></button>}
            </div>
          </div>
        ))}
      </div>
      <Modal open={formOpen} onClose={saving?undefined:()=>setFormOpen(false)} title={editing?`Editar ${entityLabel}`:`Nuevo ${entityLabel}`}
        footer={
          <>
            <button onClick={()=>setFormOpen(false)} disabled={saving} style={{ background:C.dark, border:"1px solid "+C.border, borderRadius:7, padding:"8px 16px", color:C.text, cursor:"pointer" }}>Cancelar</button>
            <button type="submit" form="catalog-form" disabled={saving} style={{ background:C.orange, border:"none", borderRadius:7, padding:"8px 18px", color:"#fff", fontWeight:700, cursor:"pointer" }}>{editing?"Guardar":"Crear"}</button>
          </>
        }>
        <form id="catalog-form" onSubmit={handleSubmit} className="space-y-4">
          <Input label="Nombre" value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} error={errors.name} required />
          <Input label="Descripcion" value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))} error={errors.description} />
          {withColor && <ColorPicker label="Color" value={form.color} onChange={color=>setForm(p=>({...p,color}))} />}
          <Checkbox label="Activo" checked={form.is_active} onChange={checked=>setForm(p=>({...p,is_active:checked}))} />
        </form>
      </Modal>
      <ConfirmDialog open={Boolean(deleting)} onClose={()=>setDeleting(null)} onConfirm={handleDelete}
        title={`Eliminar ${entityLabel}`} message={`Se eliminara "${deleting?.name}". Esta accion no se puede deshacer.`} confirmText="Eliminar" />
    </div>
  );
}