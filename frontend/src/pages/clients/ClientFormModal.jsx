import { useState, useEffect } from 'react';
import { clientsApi } from '../../api/clientsApi.js';
import { notify } from '../../lib/toast.js';
import Modal from '../../components/ui/Modal.jsx';
import Input from '../../components/ui/Input.jsx';
import Select from '../../components/ui/Select.jsx';
import Textarea from '../../components/ui/Textarea.jsx';
import Checkbox from '../../components/ui/Checkbox.jsx';
import Button from '../../components/ui/Button.jsx';

const emptyForm = {
  nit: '', dpi: '', first_name: '', last_name: '',
  email: '', address: '', phone: '',
  client_type_id: '', loyalty_tier_id: '',
  is_active: true,
  company_name: '', trade_name: '', contact_name: '', dependency: '',
};

const UNASSIGNED = '';

function getClientCategory(clientTypes, clientTypeId) {
  if (!clientTypeId) return null;
  const ct = clientTypes.find(t => String(t.id) === String(clientTypeId));
  if (!ct) return null;
  const name = ct.name.toLowerCase();
  if (name.includes('particular') || name.includes('individual') || name.includes('persona')) return 'particular';
  if (name.includes('gobierno') || name.includes('estatal') || name.includes('publico') || name.includes('municipal')) return 'gobierno';
  return 'empresa';
}

export default function ClientFormModal({ open, onClose, onSaved, client, clientTypes, loyaltyTiers }) {
  const isEdit = Boolean(client);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setForm(client ? {
      nit: client.nit || '', dpi: client.dpi || '',
      first_name: client.first_name || '', last_name: client.last_name || '',
      email: client.email || '', address: client.address || '',
      phone: client.phone || '',
      client_type_id: client.client_type_id ?? UNASSIGNED,
      loyalty_tier_id: client.loyalty_tier_id ?? UNASSIGNED,
      is_active: client.is_active,
      company_name: client.company_name || '',
      trade_name: client.trade_name || '',
      contact_name: client.contact_name || '',
      dependency: client.dependency || '',
    } : emptyForm);
  }, [open, client]);

  const setField = (field) => (e) => setForm(p => ({ ...p, [field]: e.target.value }));
  const setValue = (field) => (value) => setForm(p => ({ ...p, [field]: value }));

  const category = getClientCategory(clientTypes, form.client_type_id);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    const payload = {
      nit: form.nit.trim(),
      dpi: form.dpi.trim(),
      first_name: form.first_name,
      last_name: form.last_name,
      email: form.email.trim(),
      address: form.address,
      phone: form.phone,
      client_type_id: form.client_type_id ? Number(form.client_type_id) : null,
      loyalty_tier_id: form.loyalty_tier_id ? Number(form.loyalty_tier_id) : null,
      is_active: form.is_active,
      company_name: form.company_name,
      trade_name: form.trade_name,
      contact_name: form.contact_name,
      dependency: form.dependency,
    };
    try {
      if (isEdit) { await clientsApi.update(client.id, payload); notify.success('Cliente actualizado'); }
      else { await clientsApi.create(payload); notify.success('Cliente creado'); }
      onSaved();
    } catch (err) {
      if (err.details?.length) setErrors(Object.fromEntries(err.details.map(d => [d.field, d.message])));
      notify.error(err.message);
    } finally { setSaving(false); }
  };

  const typeOptions = [
    { value: UNASSIGNED, label: 'Seleccionar tipo...' },
    ...clientTypes.map(t => ({ value: t.id, label: t.name })),
  ];
  const loyaltyOptions = [
    { value: UNASSIGNED, label: 'Sin asignar' },
    ...loyaltyTiers.map(t => ({ value: t.id, label: `${t.name} (${Number(t.discount).toFixed(0)}%)` })),
  ];

  const categoryLabels = {
    particular: { icon: '👤', label: 'Persona Individual', color: '#3b82f6' },
    empresa:    { icon: '🏢', label: 'Empresa / Sociedad', color: '#E8551C' },
    gobierno:   { icon: '🏛️', label: 'Entidad de Gobierno', color: '#1D9E75' },
  };
  const cat = category ? categoryLabels[category] : null;

  return (
    <Modal
      open={open}
      onClose={saving ? undefined : onClose}
      title={isEdit ? 'Editar cliente' : 'Nuevo cliente'}
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button type="submit" form="client-form" loading={saving}>
            {isEdit ? 'Guardar cambios' : 'Crear cliente'}
          </Button>
        </>
      }
    >
      <form id="client-form" onSubmit={handleSubmit} className="space-y-4">

        {/* Tipo de cliente primero */}
        <div>
          <Select
            label="Tipo de cliente *"
            value={form.client_type_id}
            onChange={setValue('client_type_id')}
            options={typeOptions}
            error={errors.client_type_id}
          />
        </div>

        {/* Badge de categoria */}
        {cat && (
          <div style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 12px', background:cat.color+'15', border:'1px solid '+cat.color+'40', borderRadius:8 }}>
            <span style={{ fontSize:16 }}>{cat.icon}</span>
            <span style={{ fontSize:13, fontWeight:600, color:cat.color }}>{cat.label}</span>
          </div>
        )}

        {/* Sin tipo seleccionado */}
        {!category && (
          <p className="text-xs text-slate-500">Selecciona el tipo de cliente para ver los campos correspondientes.</p>
        )}

        {/* PARTICULAR */}
        {category === 'particular' && (
          <>
            <p className="text-xs text-slate-500">Indique al menos el <strong>NIT</strong> o el <strong>DPI</strong>.</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Nombre *" value={form.first_name} onChange={setField('first_name')} error={errors.first_name} required />
              <Input label="Apellido *" value={form.last_name} onChange={setField('last_name')} error={errors.last_name} required />
              <Input label="DPI" value={form.dpi} onChange={setField('dpi')} error={errors.dpi} />
              <Input label="NIT" value={form.nit} onChange={setField('nit')} error={errors.nit} />
              <Input label="Telefono *" value={form.phone} onChange={setField('phone')} error={errors.phone} required />
              <Input label="Correo" type="email" value={form.email} onChange={setField('email')} error={errors.email} />
              <Select label="Fidelizacion" value={form.loyalty_tier_id} onChange={setValue('loyalty_tier_id')} options={loyaltyOptions} />
            </div>
            <Textarea label="Direccion" rows={2} value={form.address} onChange={setField('address')} error={errors.address} />
          </>
        )}

        {/* EMPRESA */}
        {category === 'empresa' && (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Razon Social *" value={form.first_name} onChange={setField('first_name')} error={errors.first_name} required />
              <Input label="Nombre Comercial" value={form.trade_name} onChange={setField('trade_name')} error={errors.trade_name} />
              <Input label="NIT *" value={form.nit} onChange={setField('nit')} error={errors.nit} required />
              <Input label="Telefono *" value={form.phone} onChange={setField('phone')} error={errors.phone} required />
              <Input label="Correo" type="email" value={form.email} onChange={setField('email')} error={errors.email} />
              <Input label="Contacto Principal" value={form.contact_name} onChange={setField('contact_name')} error={errors.contact_name} />
              <Select label="Fidelizacion" value={form.loyalty_tier_id} onChange={setValue('loyalty_tier_id')} options={loyaltyOptions} />
            </div>
            <Textarea label="Direccion Fiscal" rows={2} value={form.address} onChange={setField('address')} error={errors.address} />
          </>
        )}

        {/* GOBIERNO */}
        {category === 'gobierno' && (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Nombre de la Entidad *" value={form.first_name} onChange={setField('first_name')} error={errors.first_name} required />
              <Input label="Dependencia / Unidad" value={form.dependency} onChange={setField('dependency')} error={errors.dependency} />
              <Input label="NIT" value={form.nit} onChange={setField('nit')} error={errors.nit} />
              <Input label="Telefono *" value={form.phone} onChange={setField('phone')} error={errors.phone} required />
              <Input label="Correo" type="email" value={form.email} onChange={setField('email')} error={errors.email} />
              <Input label="Contacto Principal" value={form.contact_name} onChange={setField('contact_name')} error={errors.contact_name} />
            </div>
            <Textarea label="Direccion" rows={2} value={form.address} onChange={setField('address')} error={errors.address} />
          </>
        )}

        {/* El estado activo solo se gestiona al editar; un cliente nuevo entra activo por defecto. */}
        {isEdit && <Checkbox label="Cliente activo" checked={form.is_active} onChange={setValue('is_active')} />}
      </form>
    </Modal>
  );
}
