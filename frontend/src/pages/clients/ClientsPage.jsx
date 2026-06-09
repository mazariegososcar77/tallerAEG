import { useState, useMemo } from 'react';
import { Plus, Pencil, Trash2, Search, Eye } from 'lucide-react';
import { useClients } from '../../hooks/useClients.js';
import { useClientTypes } from '../../hooks/useClientTypes.js';
import { useLoyaltyTiers } from '../../hooks/useLoyaltyTiers.js';
import { useAuth } from '../../hooks/useAuth.js';
import { clientsApi } from '../../api/clientsApi.js';
import { notify } from '../../lib/toast.js';
import PageHeader from '../../components/common/PageHeader.jsx';
import Button from '../../components/ui/Button.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Table from '../../components/ui/Table.jsx';
import Input from '../../components/ui/Input.jsx';
import Select from '../../components/ui/Select.jsx';
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx';
import ClientFormModal from './ClientFormModal.jsx';
import ClientViewModal from './ClientViewModal.jsx';
import LoyaltyTierTag from '../../components/clients/LoyaltyTierTag.jsx';

export default function ClientsPage() {
  const { clients, loading, reload } = useClients();
  const { types } = useClientTypes();
  const { tiers } = useLoyaltyTiers();
  const { hasPermission } = useAuth();

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const canCreate = hasPermission('clients.create');
  const canUpdate = hasPermission('clients.update');
  const canDelete = hasPermission('clients.delete');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return clients.filter((c) => {
      if (typeFilter && c.client_type_id !== Number(typeFilter)) return false;
      if (q && !`${c.full_name} ${c.nit} ${c.dpi} ${c.phone} ${c.email}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [clients, search, typeFilter]);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (c) => {
    setEditing(c);
    setFormOpen(true);
  };
  const handleSaved = () => {
    setFormOpen(false);
    reload();
  };

  const handleDelete = async () => {
    try {
      await clientsApi.remove(deleting.id);
      notify.success('Cliente eliminado');
      setDeleting(null);
      reload();
    } catch (err) {
      notify.error(err.message);
    }
  };

  const columns = [
    { key: 'full_name', header: 'Nombre', render: (c) => <span className="font-medium text-navy-800">{c.full_name}</span> },
    {
      key: 'nit',
      header: 'NIT / DPI',
      render: (c) => (
        <span className="font-mono text-xs text-slate-600">{c.nit || c.dpi || '—'}</span>
      ),
    },
    { key: 'phone', header: 'Telefono' },
    { key: 'client_type_name', header: 'Tipo', render: (c) => (c.client_type_name ? <Badge variant="navy">{c.client_type_name}</Badge> : '—') },
    {
      key: 'loyalty_tier_name',
      header: 'Fidelizacion',
      render: (c) =>
        c.loyalty_tier_name ? (
          <LoyaltyTierTag name={c.loyalty_tier_name} color={c.loyalty_tier_color} icon={c.loyalty_tier_icon} />
        ) : (
          '—'
        ),
    },
    {
      key: 'is_active',
      header: 'Estado',
      render: (c) =>
        c.is_active ? <Badge variant="success">Activo</Badge> : <Badge variant="gray">Inactivo</Badge>,
    },
  ];

  const typeOptions = [
    { value: '', label: 'Todos los tipos' },
    ...types.map((t) => ({ value: t.id, label: t.name })),
  ];

  return (
    <div>
      <PageHeader title="Clientes" subtitle="Clientes registrados">
        {canCreate && (
          <Button onClick={openCreate}>
            <Plus size={16} /> Nuevo cliente
          </Button>
        )}
      </PageHeader>

      {/* Filtros */}
      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
          <Input
            className="[&>input]:pl-9"
            placeholder="Buscar por nombre, NIT, DPI, telefono o correo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={typeFilter} onChange={setTypeFilter} options={typeOptions} />
      </div>

      <Table
        columns={columns}
        data={filtered}
        loading={loading}
        emptyMessage="No hay clientes. Crea uno nuevo."
        renderActions={(client) => (
          <>
            <Button variant="ghost" size="sm" title="Visualizar" onClick={() => setViewing(client)}>
              <Eye size={16} />
            </Button>
            {canUpdate && (
              <Button variant="ghost" size="sm" title="Editar" onClick={() => openEdit(client)}>
                <Pencil size={16} />
              </Button>
            )}
            {canDelete && (
              <Button variant="ghost" size="sm" title="Eliminar"
                className="text-red-600 hover:bg-red-50" onClick={() => setDeleting(client)}>
                <Trash2 size={16} />
              </Button>
            )}
          </>
        )}
      />

      <ClientFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={handleSaved}
        client={editing}
        clientTypes={types}
        loyaltyTiers={tiers}
      />

      <ClientViewModal open={Boolean(viewing)} onClose={() => setViewing(null)} client={viewing} />

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        title="Eliminar cliente"
        message={`Se eliminara a "${deleting?.full_name}". Esta accion no se puede deshacer.`}
        confirmText="Eliminar"
      />
    </div>
  );
}
