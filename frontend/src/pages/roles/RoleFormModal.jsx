import { useState, useEffect, useMemo } from 'react';
import { rolesApi } from '../../api/rolesApi.js';
import { notify } from '../../lib/toast.js';
import Modal from '../../components/ui/Modal.jsx';
import Input from '../../components/ui/Input.jsx';
import Checkbox from '../../components/ui/Checkbox.jsx';
import Button from '../../components/ui/Button.jsx';

/** Modal de creacion/edicion de rol, incluyendo asignacion de permisos. */
export default function RoleFormModal({ open, onClose, onSaved, role, permissions }) {
  const isEdit = Boolean(role);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selected, setSelected] = useState(new Set());
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  // Agrupa el catalogo de permisos por modulo.
  const groups = useMemo(() => {
    const map = {};
    for (const p of permissions) {
      (map[p.module] ||= []).push(p);
    }
    return map;
  }, [permissions]);

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setName(role?.name || '');
    setDescription(role?.description || '');
    setSelected(new Set(role?.permissions || []));
  }, [open, role]);

  const togglePermission = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleModule = (modulePerms) => {
    const ids = modulePerms.map((p) => p.id);
    const allSelected = ids.every((id) => selected.has(id));
    setSelected((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => (allSelected ? next.delete(id) : next.add(id)));
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});
    const permissionIds = [...selected];

    try {
      if (isEdit) {
        await rolesApi.update(role.id, { name, description });
        await rolesApi.setPermissions(role.id, permissionIds);
        notify.success('Rol actualizado');
      } else {
        await rolesApi.create({ name, description, permissions: permissionIds });
        notify.success('Rol creado');
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
      title={isEdit ? 'Editar rol' : 'Nuevo rol'}
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button type="submit" form="role-form" loading={loading}>
            {isEdit ? 'Guardar cambios' : 'Crear rol'}
          </Button>
        </>
      }
    >
      <form id="role-form" onSubmit={handleSubmit} className="space-y-4">
        <Input label="Nombre" name="name" value={name} onChange={(e) => setName(e.target.value)} error={errors.name} required />
        <Input
          label="Descripcion"
          name="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          error={errors.description}
        />

        <div>
          <p className="mb-2 text-sm font-medium text-navy-800">Permisos</p>
          <div className="max-h-64 space-y-4 overflow-y-auto rounded-lg border border-slate-200 p-3">
            {Object.entries(groups).map(([module, perms]) => {
              const allSelected = perms.every((p) => selected.has(p.id));
              return (
                <div key={module}>
                  <button
                    type="button"
                    onClick={() => toggleModule(perms)}
                    className="mb-1 text-xs font-semibold uppercase tracking-wide text-orange-600 hover:underline"
                  >
                    {module} {allSelected ? '(quitar todos)' : '(seleccionar todos)'}
                  </button>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {perms.map((p) => (
                      <Checkbox
                        key={p.id}
                        label={p.description}
                        checked={selected.has(p.id)}
                        onChange={() => togglePermission(p.id)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </form>
    </Modal>
  );
}
