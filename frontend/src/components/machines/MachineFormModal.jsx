// VENTANA: Alta rápida de una Máquina (equipo de un cliente). Se usa tanto desde el
// catálogo de Máquinas (`MachinesPage.jsx`) como desde `MachinePicker.jsx` (el botón
// "+ Nueva máquina" dentro de Cotizaciones/Órdenes de Trabajo/Órdenes de Servicio,
// para no tener que salir de esa pantalla a registrar el equipo antes de poder
// elegirlo). Mismos campos y estilo que ya usaba el formulario embebido en
// MachinesPage.jsx, solo que ahora es un componente aparte para poder reutilizarlo.
import { useState, useEffect } from 'react';
import { machinesApi } from '../../api/machinesApi.js';
import { withUppercase } from '../../lib/text.js';
import { notify } from '../../lib/toast.js';
import ClientPicker from '../clients/ClientPicker.jsx';

const C = { card:'var(--c-surface)', dark:'var(--c-surface-2)', border:'var(--c-line)', input:'var(--c-surface-2)', text:'var(--c-text)', muted:'var(--c-muted)', orange:'#CA8A04' };
const inp = { width:'100%', background:C.input, border:'1px solid '+C.border, color:C.text, padding:'8px 10px', borderRadius:6, fontSize:12, boxSizing:'border-box', outline:'none' };
const lbl = { display:'block', fontSize:10, fontWeight:800, color:C.muted, textTransform:'uppercase', letterSpacing:'.6px', marginBottom:5 };

const emptyForm = (clientId) => ({ client_id:clientId||'', name:'', brand:'', model:'', serial:'', kw:'', voltage:'', amperage:'', rpm:'', hp:'', location:'', notes:'' });

/**
 * Props:
 * - open/onClose: visibilidad de la ventana.
 * - onSaved(machine): se llama con la maquina ya creada/editada.
 * - clients: lista de clientes para el selector.
 * - machine: si viene, edita esa maquina; si no, crea una nueva.
 * - defaultClientId: cliente prellenado al crear (ej. el que ya esta elegido en el
 *   formulario donde se abrio esta ventana) -- se puede cambiar igual.
 */
export default function MachineFormModal({ open, onClose, onSaved, clients, machine = null, defaultClientId }) {
  const isEdit = Boolean(machine);
  const [form, setForm] = useState(emptyForm(defaultClientId));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(machine ? {
      client_id: machine.client_id, name: machine.name || '', brand: machine.brand || '',
      model: machine.model || '', serial: machine.serial || '', kw: machine.kw || '',
      voltage: machine.voltage || '', amperage: machine.amperage || '', rpm: machine.rpm || '',
      hp: machine.hp || '', location: machine.location || '', notes: machine.notes || '',
    } : emptyForm(defaultClientId));
  }, [open, machine, defaultClientId]);

  if (!open) return null;

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.client_id || !form.name) return notify.error('Cliente y nombre son obligatorios');
    setSaving(true);
    try {
      const saved = isEdit ? await machinesApi.update(machine.id, form) : await machinesApi.create(form);
      notify.success(isEdit ? 'Maquina actualizada' : 'Maquina creada');
      onSaved(saved);
    } catch (e) {
      notify.error(e.response?.data?.message || 'Error al guardar la maquina');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.6)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:200, padding:16 }}>
      <div style={{ background:C.card, border:'1px solid '+C.border, borderRadius:12, padding:24, width:'100%', maxWidth:640, maxHeight:'90vh', overflowY:'auto' }}>
        <h2 style={{ fontSize:16, fontWeight:700, color:C.text, marginBottom:20 }}>{isEdit ? 'Editar Maquina' : 'Nueva Maquina'}</h2>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          <div style={{ gridColumn:'span 2' }}>
            <label style={lbl}>Cliente *</label>
            <ClientPicker clients={clients} value={form.client_id} onChange={v => set('client_id', v)} />
          </div>
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
          <button onClick={onClose} disabled={saving} style={{ background:C.dark, border:'1px solid '+C.border, borderRadius:7, padding:'9px 18px', color:C.text, cursor:'pointer' }}>Cancelar</button>
          <button onClick={handleSave} disabled={saving} style={{ background:C.orange, border:'none', borderRadius:7, padding:'9px 20px', color:'#fff', fontWeight:700, cursor:'pointer', opacity:saving?0.7:1 }}>{saving ? 'Guardando...' : 'Guardar'}</button>
        </div>
      </div>
    </div>
  );
}
