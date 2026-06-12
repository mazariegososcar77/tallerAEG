import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, Award } from "lucide-react";
import { useLoyaltyTiers } from "../../hooks/useLoyaltyTiers.js";
import { loyaltyTiersApi } from "../../api/loyaltyTiersApi.js";
import { useAuth } from "../../hooks/useAuth.js";
import { notify } from "../../lib/toast.js";
import Modal from "../../components/ui/Modal.jsx";
import Input from "../../components/ui/Input.jsx";
import Textarea from "../../components/ui/Textarea.jsx";
import Checkbox from "../../components/ui/Checkbox.jsx";
import ConfirmDialog from "../../components/ui/ConfirmDialog.jsx";
import LoyaltyTierTag from "../../components/clients/LoyaltyTierTag.jsx";
import { LOYALTY_COLORS, LOYALTY_ICONS, DEFAULT_LOYALTY_COLOR, DEFAULT_LOYALTY_ICON } from "../../lib/loyalty.js";

const C = { card:"#16285C", dark:"#112048", border:"#1F3470", text:"#e2e8f0", muted:"#5a7aa8", orange:"#E8551C" };
const emptyForm = { name:"", discount:0, benefits:"", color:DEFAULT_LOYALTY_COLOR, icon:DEFAULT_LOYALTY_ICON, is_active:true };

export default function LoyaltyTiersPage() {
  const { tiers, loading, reload } = useLoyaltyTiers();
  const { hasPermission } = useAuth();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!formOpen) return;
    setForm(editing ? { name:editing.name, discount:editing.discount??0, benefits:editing.benefits||"", color:editing.color||DEFAULT_LOYALTY_COLOR, icon:editing.icon||DEFAULT_LOYALTY_ICON, is_active:editing.is_active } : emptyForm);
  }, [formOpen, editing]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { name:form.name, discount:Number(form.discount)||0, benefits:form.benefits, color:form.color, icon:form.icon, is_active:form.is_active };
      if (editing) { await loyaltyTiersApi.update(editing.id, payload); notify.success("Nivel actualizado"); }
      else { await loyaltyTiersApi.create(payload); notify.success("Nivel creado"); }
      setFormOpen(false); reload();
    } catch(err) { notify.error(err.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    try {
      await loyaltyTiersApi.remove(deleting.id);
      notify.success("Nivel eliminado");
      setDeleting(null); reload();
    } catch(err) { notify.error(err.message); }
  };

  return (
    <div style={{ padding:"20px 16px", maxWidth:900, margin:"0 auto" }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:12, marginBottom:20 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <Award size={26} color="#E8551C" />
          <div>
            <h1 style={{ fontSize:20, fontWeight:700, margin:0, color:C.text }}>Fidelizacion</h1>
            <p style={{ fontSize:13, color:C.muted, margin:0 }}>Niveles de fidelizacion: descuento y beneficios</p>
          </div>
        </div>
        {hasPermission("loyalty.create") && (
          <button onClick={() => { setEditing(null); setFormOpen(true); }} style={{ display:"flex", alignItems:"center", gap:6, background:C.orange, color:"#fff", border:"none", borderRadius:8, padding:"9px 16px", fontWeight:600, cursor:"pointer", fontSize:13 }}>
            <Plus size={16} /> Nuevo nivel
          </button>
        )}
      </div>
      <div style={{ background:C.card, border:"1px solid "+C.border, borderRadius:12, overflow:"hidden" }}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 100px 1fr 100px 100px", background:C.dark, padding:"10px 16px", borderBottom:"1px solid "+C.border }}>
          {["Nivel","Descuento","Beneficios","Estado","Acciones"].map((h,i) => (
            <span key={i} style={{ fontSize:11, fontWeight:800, color:C.muted, textTransform:"uppercase", letterSpacing:".6px", textAlign:i===4?"right":"left" }}>{h}</span>
          ))}
        </div>
        {loading ? <p style={{ color:C.muted, textAlign:"center", padding:40 }}>Cargando...</p>
        : tiers.length === 0 ? <div style={{ textAlign:"center", padding:"48px 0", color:C.muted }}><p>No hay niveles.</p></div>
        : tiers.map(t => (
          <div key={t.id} style={{ display:"grid", gridTemplateColumns:"1fr 100px 1fr 100px 100px", padding:"12px 16px", borderBottom:"1px solid "+C.border, alignItems:"center" }}>
            <LoyaltyTierTag name={t.name} color={t.color} icon={t.icon} />
            <span style={{ background:C.orange+"22", color:C.orange, border:"1px solid "+C.orange+"44", borderRadius:20, padding:"2px 8px", fontSize:11, fontWeight:600, width:"fit-content" }}>{Number(t.discount).toFixed(0)}%</span>
            <span style={{ fontSize:13, color:C.muted }}>{t.benefits || "—"}</span>
            <span style={{ background:t.is_active?"#10b98122":"#ef444422", color:t.is_active?"#10b981":"#ef4444", border:"1px solid "+(t.is_active?"#10b98144":"#ef444444"), borderRadius:20, padding:"2px 8px", fontSize:11, fontWeight:600, width:"fit-content" }}>
              {t.is_active ? "Activo" : "Inactivo"}
            </span>
            <div style={{ display:"flex", gap:6, justifyContent:"flex-end" }}>
              {hasPermission("loyalty.update") && <button onClick={() => { setEditing(t); setFormOpen(true); }} style={{ background:C.dark, border:"1px solid "+C.border, borderRadius:6, padding:"5px 8px", cursor:"pointer", color:C.muted }}><Pencil size={14}/></button>}
              {hasPermission("loyalty.delete") && <button onClick={() => setDeleting(t)} style={{ background:"#ef444415", border:"1px solid #ef444440", borderRadius:6, padding:"5px 8px", cursor:"pointer", color:"#ef4444" }}><Trash2 size={14}/></button>}
            </div>
          </div>
        ))}
      </div>
      <Modal open={formOpen} onClose={saving?undefined:()=>setFormOpen(false)} title={editing?"Editar nivel":"Nuevo nivel"}
        footer={
          <>
            <button onClick={()=>setFormOpen(false)} disabled={saving} style={{ background:C.dark, border:"1px solid "+C.border, borderRadius:7, padding:"8px 16px", color:C.text, cursor:"pointer" }}>Cancelar</button>
            <button type="submit" form="loyalty-form" disabled={saving} style={{ background:C.orange, border:"none", borderRadius:7, padding:"8px 18px", color:"#fff", fontWeight:700, cursor:"pointer" }}>{editing?"Guardar":"Crear"}</button>
          </>
        }>
        <form id="loyalty-form" onSubmit={handleSubmit} className="space-y-4">
          <Input label="Nivel" value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} required />
          <Input label="Descuento (%)" type="number" min="0" max="100" value={form.discount} onChange={e=>setForm(p=>({...p,discount:e.target.value}))} />
          <Textarea label="Beneficios" rows={3} value={form.benefits} onChange={e=>setForm(p=>({...p,benefits:e.target.value}))} />
          <div>
            <label style={{ display:"block", fontSize:11, fontWeight:800, color:C.muted, textTransform:"uppercase", letterSpacing:".6px", marginBottom:8 }}>Color</label>
            <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
              {LOYALTY_COLORS.map(c => (
                <button key={c.key} type="button" onClick={()=>setForm(p=>({...p,color:c.value}))}
                  style={{ width:28, height:28, borderRadius:"50%", background:c.value, border:form.color?.toLowerCase()===c.value.toLowerCase()?"3px solid #fff":"2px solid transparent", cursor:"pointer" }} />
              ))}
            </div>
          </div>
          <div>
            <label style={{ display:"block", fontSize:11, fontWeight:800, color:C.muted, textTransform:"uppercase", letterSpacing:".6px", marginBottom:8 }}>Icono</label>
            <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
              {LOYALTY_ICONS.map(({key, label, Icon}) => (
                <button key={key} type="button" title={label} onClick={()=>setForm(p=>({...p,icon:key}))}
                  style={{ width:36, height:36, borderRadius:8, border:"1px solid "+(form.icon===key?C.orange:C.border), background:form.icon===key?C.orange+"22":C.dark, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", color:form.icon===key?C.orange:C.muted }}>
                  <Icon size={16} />
                </button>
              ))}
            </div>
          </div>
          <div>
            <label style={{ display:"block", fontSize:11, fontWeight:800, color:C.muted, textTransform:"uppercase", letterSpacing:".6px", marginBottom:8 }}>Vista previa</label>
            <LoyaltyTierTag name={form.name||"Nivel"} color={form.color} icon={form.icon} size={16} />
          </div>
          <Checkbox label="Activo" checked={form.is_active} onChange={checked=>setForm(p=>({...p,is_active:checked}))} />
        </form>
      </Modal>
      <ConfirmDialog open={Boolean(deleting)} onClose={()=>setDeleting(null)} onConfirm={handleDelete}
        title="Eliminar nivel" message={`Se eliminara "${deleting?.name}". Esta accion no se puede deshacer.`} confirmText="Eliminar" />
    </div>
  );
}
