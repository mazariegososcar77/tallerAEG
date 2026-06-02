import { useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { useRoles } from '../../hooks/useRoles.js';
import { usePermissions } from '../../hooks/usePermissions.js';
import { useAuth } from '../../hooks/useAuth.js';
import { rolesApi } from '../../api/rolesApi.js';
import { notify } from '../../lib/toast.js';
import PageHeader from '../../components/common/PageHeader.jsx';
import Button from '../../components/ui/Button.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Table from '../../components/ui/Table.jsx';
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx';
import RoleFormModal from './RoleFormModal.jsx';

export default function RolesPage() {
  const { roles, loading, reload } = useRoles();
  const { permissions } = usePermissions();
  const { hasPermission } = useAuth();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const canCreate = hasPermission('roles.create');
  const canUpdate = hasPermission('roles.update');
  const canDelete = hasPermission('roles.delete');

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (role) => {
    setEditing(role);
    setFormOpen(true);
  };

  const handleSaved = () => {
    setFormOpen(false);
    reload();
  };

  const handleDelete = async () => {
    try {
      await rolesApi.remove(deleting.id);
      notify.success('Rol eliminado');
      setDeleting(null);
      reload();
    } catch (err) {
      notify.error(err.message);
    }
  };

  const columns = [
    { key: 'name', header: 'Rol', render: (r) => <span className="font-medium text-navy-800">{r.name}</span> },
    { key: 'description', header: 'Descripcion', render: (r) => r.description || '—' },
    {
      key: 'permissions',
      header: 'Permisos',
      render: (r) => <Badge variant="orange">{r.permissions.length} permisos</Badge>,
    },
  ];

  return (
    <div>
      <PageHeader title="Roles" subtitle="Define perfiles y sus permisos">
        {canCreate && (
          <Button onClick={openCreate}>
            <Plus size={16} /> Nuevo rol
          </Button>
        )}
      </PageHeader>

      <Table
        columns={columns}
        data={roles}
        loading={loading}
        emptyMessage="No hay roles registrados."
        renderActions={
          canUpdate || canDelete
            ? (role) => (
                <>
                  {canUpdate && (
                    <Button variant="ghost" size="sm" onClick={() => openEdit(role)} title="Editar">
                      <Pencil size={16} />
                    </Button>
                  )}
                  {canDelete && (
                    <Button variant="ghost" size="sm" onClick={() => setDeleting(role)} title="Eliminar"
                      className="text-red-600 hover:bg-red-50">
                      <Trash2 size={16} />
                    </Button>
                  )}
                </>
              )
            : undefined
        }
      />

      <RoleFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={handleSaved}
        role={editing}
        permissions={permissions}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        title="Eliminar rol"
        message={`Se eliminara el rol "${deleting?.name}". Esta accion no se puede deshacer.`}
        confirmText="Eliminar"
      />
    </div>
  );
}
