import { useState, useEffect } from 'react';
import { usersApi } from '../../api/usersApi.js';
import { notify } from '../../lib/toast.js';
import Modal from '../../components/ui/Modal.jsx';
import Input from '../../components/ui/Input.jsx';
import Select from '../../components/ui/Select.jsx';
import Checkbox from '../../components/ui/Checkbox.jsx';
import Button from '../../components/ui/Button.jsx';

const emptyForm = { name: '', email: '', password: '', role_id: '', is_active: true };

/** Modal de creacion/edicion de usuario. user=null -> crear. */
export default function UserFormModal({ open, onClose, onSaved, user, roles }) {
  const isEdit = Boolean(user);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setErrors({});
    if (user) {
      setForm({ name: user.name, email: user.email, password: '', role_id: user.role_id, is_active: user.is_active });
    } else {
      setForm({ ...emptyForm, role_id: roles[0]?.id ?? '' });
    }
  }, [open, user, roles]);

  const setField = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));
  const setValue = (field) => (value) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    const payload = {
      name: form.name,
      email: form.email,
      role_id: Number(form.role_id),
      is_active: form.is_active,
    };
    if (!isEdit || form.password) payload.password = form.password;

    try {
      if (isEdit) {
        await usersApi.update(user.id, payload);
        notify.success('Usuario actualizado');
      } else {
        await usersApi.create(payload);
        notify.success('Usuario creado');
      }
      onSaved();
    } catch (err) {
      if (err.details?.length) {
        setErrors(Object.fromEntries(err.details.map((d) => [d.field, d.message])));
      }
      notify.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={loading ? undefined : onClose}
      title={isEdit ? 'Editar usuario' : 'Nuevo usuario'}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button type="submit" form="user-form" loading={loading}>
            {isEdit ? 'Guardar cambios' : 'Crear usuario'}
          </Button>
        </>
      }
    >
      <form id="user-form" onSubmit={handleSubmit} className="space-y-4">
        <Input label="Nombre" name="name" value={form.name} onChange={setField('name')} error={errors.name} required />
        <Input
          label="Correo electronico"
          type="email"
          name="email"
          value={form.email}
          onChange={setField('email')}
          error={errors.email}
          required
        />
        <Input
          label={isEdit ? 'Contrasena (dejar en blanco para no cambiar)' : 'Contrasena'}
          type="password"
          name="password"
          value={form.password}
          onChange={setField('password')}
          error={errors.password}
          required={!isEdit}
        />
        <Select
          label="Rol"
          value={form.role_id}
          onChange={setValue('role_id')}
          error={errors.role_id}
          options={roles.map((r) => ({ value: r.id, label: r.name }))}
        />
        <Checkbox
          label="Usuario activo"
          checked={form.is_active}
          onChange={setValue('is_active')}
        />
      </form>
    </Modal>
  );
}
