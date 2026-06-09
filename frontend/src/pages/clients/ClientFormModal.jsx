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
  nit: '',
  dpi: '',
  first_name: '',
  last_name: '',
  email: '',
  address: '',
  phone: '',
  client_type_id: '',
  loyalty_tier_id: '',
  is_active: true,
};

const UNASSIGNED = '';

/** Modal de creacion/edicion de cliente. client=null -> crear. */
export default function ClientFormModal({ open, onClose, onSaved, client, clientTypes, loyaltyTiers }) {
  const isEdit = Boolean(client);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setForm(
      client
        ? {
            nit: client.nit || '',
            dpi: client.dpi || '',
            first_name: client.first_name,
            last_name: client.last_name,
            email: client.email || '',
            address: client.address || '',
            phone: client.phone || '',
            client_type_id: client.client_type_id ?? UNASSIGNED,
            loyalty_tier_id: client.loyalty_tier_id ?? UNASSIGNED,
            is_active: client.is_active,
          }
        : emptyForm,
    );
  }, [open, client]);

  const setField = (field) => (e) => setForm((p) => ({ ...p, [field]: e.target.value }));
  const setValue = (field) => (value) => setForm((p) => ({ ...p, [field]: value }));

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
    };
    try {
      if (isEdit) {
        await clientsApi.update(client.id, payload);
        notify.success('Cliente actualizado');
      } else {
        await clientsApi.create(payload);
        notify.success('Cliente creado');
      }
      onSaved();
    } catch (err) {
      if (err.details?.length) {
        setErrors(Object.fromEntries(err.details.map((d) => [d.field, d.message])));
      }
      notify.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const typeOptions = [
    { value: UNASSIGNED, label: 'Sin asignar' },
    ...clientTypes.map((t) => ({ value: t.id, label: t.name })),
  ];
  const loyaltyOptions = [
    { value: UNASSIGNED, label: 'Sin asignar' },
    ...loyaltyTiers.map((t) => ({ value: t.id, label: `${t.name} (${Number(t.discount).toFixed(0)}%)` })),
  ];

  return (
    <Modal
      open={open}
      onClose={saving ? undefined : onClose}
      title={isEdit ? 'Editar cliente' : 'Nuevo cliente'}
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" form="client-form" loading={saving}>
            {isEdit ? 'Guardar cambios' : 'Crear cliente'}
          </Button>
        </>
      }
    >
      <form id="client-form" onSubmit={handleSubmit} className="space-y-4">
        <p className="text-xs text-slate-500">
          Indique al menos el <strong>NIT</strong> o el <strong>DPI</strong> (solo uno de los dos puede quedar vacio).
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="NIT" value={form.nit} onChange={setField('nit')} error={errors.nit} />
          <Input label="DPI" value={form.dpi} onChange={setField('dpi')} error={errors.dpi} />
          <Input label="Nombre" value={form.first_name} onChange={setField('first_name')} error={errors.first_name} required />
          <Input label="Apellido" value={form.last_name} onChange={setField('last_name')} error={errors.last_name} required />
          <Input label="Telefono" value={form.phone} onChange={setField('phone')} error={errors.phone} required />
          <Input label="Correo" type="email" value={form.email} onChange={setField('email')} error={errors.email} />
          <Select label="Tipo de cliente" value={form.client_type_id} onChange={setValue('client_type_id')} options={typeOptions} error={errors.client_type_id} />
          <Select label="Fidelizacion" value={form.loyalty_tier_id} onChange={setValue('loyalty_tier_id')} options={loyaltyOptions} error={errors.loyalty_tier_id} />
        </div>
        <Textarea label="Direccion" rows={2} value={form.address} onChange={setField('address')} error={errors.address} />
        <Checkbox label="Cliente activo" checked={form.is_active} onChange={setValue('is_active')} />
      </form>
    </Modal>
  );
}
