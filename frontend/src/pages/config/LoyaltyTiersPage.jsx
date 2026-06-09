import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { useLoyaltyTiers } from '../../hooks/useLoyaltyTiers.js';
import { loyaltyTiersApi } from '../../api/loyaltyTiersApi.js';
import { useAuth } from '../../hooks/useAuth.js';
import { notify } from '../../lib/toast.js';
import PageHeader from '../../components/common/PageHeader.jsx';
import Button from '../../components/ui/Button.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Table from '../../components/ui/Table.jsx';
import Modal from '../../components/ui/Modal.jsx';
import Input from '../../components/ui/Input.jsx';
import Textarea from '../../components/ui/Textarea.jsx';
import Checkbox from '../../components/ui/Checkbox.jsx';
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx';
import LoyaltyTierTag from '../../components/clients/LoyaltyTierTag.jsx';
import {
  LOYALTY_COLORS,
  LOYALTY_ICONS,
  DEFAULT_LOYALTY_COLOR,
  DEFAULT_LOYALTY_ICON,
} from '../../lib/loyalty.js';

const emptyForm = {
  name: '',
  discount: 0,
  benefits: '',
  color: DEFAULT_LOYALTY_COLOR,
  icon: DEFAULT_LOYALTY_ICON,
  is_active: true,
};

/** Configuracion de Fidelizacion: niveles con descuento (%) y beneficios. */
export default function LoyaltyTiersPage() {
  const { tiers, loading, reload } = useLoyaltyTiers();
  const { hasPermission } = useAuth();

  const canCreate = hasPermission('loyalty.create');
  const canUpdate = hasPermission('loyalty.update');
  const canDelete = hasPermission('loyalty.delete');

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!formOpen) return;
    setErrors({});
    setForm(
      editing
        ? {
            name: editing.name,
            discount: editing.discount ?? 0,
            benefits: editing.benefits || '',
            color: editing.color || DEFAULT_LOYALTY_COLOR,
            icon: editing.icon || DEFAULT_LOYALTY_ICON,
            is_active: editing.is_active,
          }
        : emptyForm,
    );
  }, [formOpen, editing]);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (tier) => {
    setEditing(tier);
    setFormOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    const payload = {
      name: form.name,
      discount: Number(form.discount) || 0,
      benefits: form.benefits,
      color: form.color,
      icon: form.icon,
      is_active: form.is_active,
    };
    try {
      if (editing) {
        await loyaltyTiersApi.update(editing.id, payload);
        notify.success('Nivel actualizado');
      } else {
        await loyaltyTiersApi.create(payload);
        notify.success('Nivel creado');
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
      await loyaltyTiersApi.remove(deleting.id);
      notify.success('Nivel eliminado');
      setDeleting(null);
      reload();
    } catch (err) {
      notify.error(err.message);
    }
  };

  const columns = [
    { key: 'name', header: 'Nivel', render: (r) => <LoyaltyTierTag name={r.name} color={r.color} icon={r.icon} /> },
    { key: 'discount', header: 'Descuento', render: (r) => <Badge variant="orange">{Number(r.discount).toFixed(0)}%</Badge> },
    { key: 'benefits', header: 'Beneficios', render: (r) => r.benefits || '—' },
    {
      key: 'is_active',
      header: 'Estado',
      render: (r) =>
        r.is_active ? <Badge variant="success">Activo</Badge> : <Badge variant="gray">Inactivo</Badge>,
    },
  ];

  return (
    <div>
      <PageHeader title="Fidelizacion" subtitle="Niveles de fidelizacion: descuento y beneficios">
        {canCreate && (
          <Button onClick={openCreate}>
            <Plus size={16} /> Nuevo nivel
          </Button>
        )}
      </PageHeader>

      <Table
        columns={columns}
        data={tiers}
        loading={loading}
        emptyMessage="No hay niveles de fidelizacion."
        renderActions={
          canUpdate || canDelete
            ? (tier) => (
                <>
                  {canUpdate && (
                    <Button variant="ghost" size="sm" onClick={() => openEdit(tier)} title="Editar">
                      <Pencil size={16} />
                    </Button>
                  )}
                  {canDelete && (
                    <Button variant="ghost" size="sm" onClick={() => setDeleting(tier)} title="Eliminar"
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
        title={editing ? 'Editar nivel' : 'Nuevo nivel'}
        footer={
          <>
            <Button variant="outline" onClick={() => setFormOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" form="loyalty-form" loading={saving}>
              {editing ? 'Guardar' : 'Crear'}
            </Button>
          </>
        }
      >
        <form id="loyalty-form" onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Nivel"
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            error={errors.name}
            required
          />
          <Input
            label="Descuento (%)"
            type="number"
            min="0"
            max="100"
            step="any"
            value={form.discount}
            onChange={(e) => setForm((p) => ({ ...p, discount: e.target.value }))}
            error={errors.discount}
          />
          <Textarea
            label="Beneficios"
            rows={4}
            value={form.benefits}
            onChange={(e) => setForm((p) => ({ ...p, benefits: e.target.value }))}
            error={errors.benefits}
          />

          {/* Color distintivo */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-navy-800">Color distintivo</label>
            <div className="flex flex-wrap items-center gap-2">
              {LOYALTY_COLORS.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  title={c.label}
                  onClick={() => setForm((p) => ({ ...p, color: c.value }))}
                  className={`h-7 w-7 rounded-full border-2 transition ${
                    form.color?.toLowerCase() === c.value.toLowerCase()
                      ? 'border-navy-800 ring-2 ring-navy-200'
                      : 'border-white shadow-sm'
                  }`}
                  style={{ backgroundColor: c.value }}
                />
              ))}
              <label
                className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border-2 border-dashed border-slate-300 text-slate-400"
                title="Color personalizado"
              >
                <input
                  type="color"
                  value={form.color || DEFAULT_LOYALTY_COLOR}
                  onChange={(e) => setForm((p) => ({ ...p, color: e.target.value }))}
                  className="h-0 w-0 opacity-0"
                />
                +
              </label>
            </div>
            {errors.color && <p className="mt-1 text-xs text-red-600">{errors.color}</p>}
          </div>

          {/* Icono distintivo */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-navy-800">Icono distintivo</label>
            <div className="flex flex-wrap items-center gap-2">
              {LOYALTY_ICONS.map(({ key, label, Icon }) => (
                <button
                  key={key}
                  type="button"
                  title={label}
                  onClick={() => setForm((p) => ({ ...p, icon: key }))}
                  className={`flex h-9 w-9 items-center justify-center rounded-lg border transition ${
                    form.icon === key
                      ? 'border-navy-800 bg-navy-50'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                  style={form.icon === key ? { color: form.color || DEFAULT_LOYALTY_COLOR } : undefined}
                >
                  <Icon size={18} />
                </button>
              ))}
            </div>
          </div>

          {/* Vista previa */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-navy-800">Vista previa</label>
            <LoyaltyTierTag name={form.name || 'Nivel'} color={form.color} icon={form.icon} size={16} />
          </div>

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
        title="Eliminar nivel"
        message={`Se eliminara "${deleting?.name}". Esta accion no se puede deshacer.`}
        confirmText="Eliminar"
      />
    </div>
  );
}
