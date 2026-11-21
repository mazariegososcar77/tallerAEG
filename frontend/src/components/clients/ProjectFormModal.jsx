// VENTANA: Alta rapida de un sub-proyecto de un cliente (ver ProjectPicker.jsx). Solo dos
// campos -- nombre y ubicacion -- a proposito: es apenas una etiqueta para distinguir
// proyectos/sucursales de un mismo cliente, no un registro completo como una maquina.
import { useState, useEffect } from 'react';
import { clientProjectsApi } from '../../api/clientProjectsApi.js';
import { withUppercase } from '../../lib/text.js';
import { notify } from '../../lib/toast.js';

const C = { card:'var(--c-surface)', dark:'var(--c-surface-2)', border:'var(--c-line)', input:'var(--c-surface-2)', text:'var(--c-text)', muted:'var(--c-muted)', orange:'#CA8A04' };
const inp = { width:'100%', background:C.input, border:'1px solid '+C.border, color:C.text, padding:'8px 10px', borderRadius:6, fontSize:12, boxSizing:'border-box', outline:'none' };
const lbl = { display:'block', fontSize:10, fontWeight:800, color:C.muted, textTransform:'uppercase', letterSpacing:'.6px', marginBottom:5 };

/**
 * Props:
 * - open/onClose: visibilidad de la ventana.
 * - clientId: cliente dueño del proyecto nuevo.
 * - defaultName: con lo que ya haya escrito el usuario en el buscador del ProjectPicker.
 * - onSaved(project): se llama con el proyecto ya creado.
 */
export default function ProjectFormModal({ open, onClose, clientId, defaultName = '', onSaved }) {
  const [form, setForm] = useState({ name:'', location:'' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setForm({ name: defaultName || '', location: '' });
  }, [open, defaultName]);

  if (!open) return null;

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.name.trim()) return notify.error('El nombre del proyecto es obligatorio');
    setSaving(true);
    try {
      const saved = await clientProjectsApi.create(clientId, form);
      notify.success('Proyecto creado');
      onSaved(saved);
    } catch (e) {
      notify.error(e.message || 'Error al crear el proyecto');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.6)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:210, padding:16 }}>
      <div style={{ background:C.card, border:'1px solid '+C.border, borderRadius:12, padding:24, width:'100%', maxWidth:420 }}>
        <h2 style={{ fontSize:16, fontWeight:700, color:C.text, marginBottom:20 }}>Nuevo Proyecto</h2>
        <div style={{ display:'grid', gap:12 }}>
          <div><label style={lbl}>Nombre *</label><input value={form.name} onChange={withUppercase(e => set('name', e.target.value))} style={inp} autoFocus /></div>
          <div><label style={lbl}>Ubicacion</label><input value={form.location} onChange={withUppercase(e => set('location', e.target.value))} style={inp} /></div>
        </div>
        <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:16 }}>
          <button onClick={onClose} disabled={saving} style={{ background:C.dark, border:'1px solid '+C.border, borderRadius:7, padding:'9px 18px', color:C.text, cursor:'pointer' }}>Cancelar</button>
          <button onClick={handleSave} disabled={saving} style={{ background:C.orange, border:'none', borderRadius:7, padding:'9px 20px', color:'#fff', fontWeight:700, cursor:'pointer', opacity:saving?0.7:1 }}>{saving ? 'Guardando...' : 'Guardar'}</button>
        </div>
      </div>
    </div>
  );
}
