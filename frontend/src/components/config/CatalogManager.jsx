import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth.js';
import { notify } from '../../lib/toast.js';
import PageHeader from '../common/PageHeader.jsx';
import Button from '../ui/Button.jsx';
import Badge from '../ui/Badge.jsx';
import Table from '../ui/Table.jsx';
import Modal from '../ui/Modal.jsx';
import Input from '../ui/Input.jsx';
import Checkbox from '../ui/Checkbox.jsx';
import ColorPicker from '../ui/ColorPicker.jsx';
import ConfirmDialog from '../ui/ConfirmDialog.jsx';

const DEFAULT_COLOR = '#16285C';

/**
 * CRUD reutilizable para catalogos simples { name, description, is_active }.
 * Lo usan Tipos de articulo y Bodegas. La pagina pasa items/loading/reload, la api
 * y el prefijo de permisos (p.ej. "warehouses" -> warehouses.create/update/delete).
 * Con `withColor` agrega un campo de color (usado por Bodegas).
 */
export default function CatalogManager({
  title,
  subtitle,
  entityLabel,
  items,
  loading,
  reload,
  api,
  permPrefix,
  withColor = false,
}) {
  const { hasPermission } = useAuth();
  const canCreate = hasPermission(`${permPrefix}.create`);
  const canUpdate = hasPermission(`${permPrefix}.update`);
  const canDelete = hasPermission(`${permPrefix}.delete`);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', color: DEFAULT_COLOR, is_active: true });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!formOpen) return;
    setErrors({});
    setForm(
      editing
        ? {
            name: editing.name,
            description: editing.description || '',
            color: editing.color || DEFAULT_COLOR,
            is_active: editing.is_active,
          }
        : { name: '', description: '', color: DEFAULT_COLOR, is_active: true },
    );
  }, [formOpen, editing]);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (item) => {
    setEditing(item);
    setFormOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    const payload = { name: form.name, description: form.description, is_active: form.is_active };
    if (withColor) payload.color = form.color;
    try {
      if (editing) {
        await api.update(editing.id, payload);
        notify.success(`${entityLabel} actualizado`);
      } else {
        await api.create(payload);
        notify.success(`${entityLabel} creado`);
      }
      setFormOpen(false);
      reload();
    } catch (err) {
      if (err.details?.length) {
        setErrors(Object.fromEntries(err.details.map((d) => [d.field, d.message])));
      }
      notify.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await api.remove(deleting.id);
      notify.success(`${entityLabel} eliminado`);
      setDeleting(null);
      reload();
    } catch (err) {
      notify.error(err.message);
    }
  };

  const columns = [
    ...(withColor
      ? [
          {
            key: 'color',
            header: 'Color',
            render: (r) => (
              <span
                className="inline-block h-5 w-5 rounded-full border border-slate-200"
                style={{ backgroundColor: r.color || DEFAULT_COLOR }}
                title={r.color}
              />
            ),
          },
        ]
      : []),
    { key: 'name', header: 'Nombre', render: (r) => <span className="font-medium text-navy-800">{r.name}</span> },
    { key: 'description', header: 'Descripcion', render: (r) => r.description || '—' },
    {
      key: 'is_active',
      header: 'Estado',
      render: (r) =>
        r.is_active ? <Badge variant="success">Activo</Badge> : <Badge variant="gray">Inactivo</Badge>,
    },
  ];

  return (
    <div>
      <PageHeader title={title} subtitle={subtitle}>
        {canCreate && (
          <Button onClick={openCreate}>
            <Plus size={16} /> Nuevo
          </Button>
        )}
      </PageHeader>

      <Table
        columns={columns}
        data={items}
        loading={loading}
        emptyMessage="No hay registros."
        renderActions={
          canUpdate || canDelete
            ? (item) => (
                <>
                  {canUpdate && (
                    <Button variant="ghost" size="sm" onClick={() => openEdit(item)} title="Editar">
                      <Pencil size={16} />
                    </Button>
                  )}
                  {canDelete && (
                    <Button variant="ghost" size="sm" onClick={() => setDeleting(item)} title="Eliminar"
                      className="text-red-600 hover:bg-red-50">
                      <Trash2 size={16} />
                    </Button>
                  )}
                </>
              )
            : undefined
        }
      />

      <Modal
        open={formOpen}
        onClose={saving ? undefined : () => setFormOpen(false)}
        title={editing ? `Editar ${entityLabel}` : `Nuevo ${entityLabel}`}
        footer={
          <>
            <Button variant="outline" onClick={() => setFormOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" form="catalog-form" loading={saving}>
              {editing ? 'Guardar' : 'Crear'}
            </Button>
          </>
        }
      >
        <form id="catalog-form" onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Nombre"
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            error={errors.name}
            required
          />
          <Input
            label="Descripcion"
            value={form.description}
            onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            error={errors.description}
          />
          {withColor && (
            <ColorPicker
              label="Color"
              value={form.color}
              onChange={(color) => setForm((p) => ({ ...p, color }))}
            />
          )}
          <Checkbox
            label="Activo"
            checked={form.is_active}
            onChange={(checked) => setForm((p) => ({ ...p, is_active: checked }))}
          />
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        title={`Eliminar ${entityLabel}`}
        message={`Se eliminara "${deleting?.name}". Esta accion no se puede deshacer.`}
        confirmText="Eliminar"
      />
    </div>
  );
}
