import { useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { useUsers } from '../../hooks/useUsers.js';
import { useRoles } from '../../hooks/useRoles.js';
import { useAuth } from '../../hooks/useAuth.js';
import { usersApi } from '../../api/usersApi.js';
import { notify } from '../../lib/toast.js';
import PageHeader from '../../components/common/PageHeader.jsx';
import Button from '../../components/ui/Button.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Table from '../../components/ui/Table.jsx';
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx';
import UserFormModal from './UserFormModal.jsx';

export default function UsersPage() {
  const { users, loading, reload } = useUsers();
  const { roles } = useRoles();
  const { hasPermission } = useAuth();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const canCreate = hasPermission('users.create');
  const canUpdate = hasPermission('users.update');
  const canDelete = hasPermission('users.delete');

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (user) => {
    setEditing(user);
    setFormOpen(true);
  };

  const handleSaved = () => {
    setFormOpen(false);
    reload();
  };

  const handleDelete = async () => {
    try {
      await usersApi.remove(deleting.id);
      notify.success('Usuario eliminado');
      setDeleting(null);
      reload();
    } catch (err) {
      notify.error(err.message);
    }
  };

  const columns = [
    { key: 'name', header: 'Nombre' },
    { key: 'email', header: 'Correo' },
    { key: 'role_name', header: 'Rol', render: (u) => <Badge variant="navy">{u.role_name}</Badge> },
    {
      key: 'is_active',
      header: 'Estado',
      render: (u) =>
        u.is_active ? <Badge variant="success">Activo</Badge> : <Badge variant="gray">Inactivo</Badge>,
    },
  ];

  return (
    <div>
      <PageHeader title="Usuarios" subtitle="Gestiona las cuentas del sistema">
        {canCreate && (
          <Button onClick={openCreate}>
            <Plus size={16} /> Nuevo usuario
          </Button>
        )}
      </PageHeader>

      <Table
        columns={columns}
        data={users}
        loading={loading}
        emptyMessage="No hay usuarios registrados."
        renderActions={
          canUpdate || canDelete
            ? (user) => (
                <>
                  {canUpdate && (
                    <Button variant="ghost" size="sm" onClick={() => openEdit(user)} title="Editar">
                      <Pencil size={16} />
                    </Button>
                  )}
                  {canDelete && (
                    <Button variant="ghost" size="sm" onClick={() => setDeleting(user)} title="Eliminar"
                      className="text-red-600 hover:bg-red-50">
                      <Trash2 size={16} />
                    </Button>
                  )}
                </>
              )
            : undefined
        }
      />

      <UserFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={handleSaved}
        user={editing}
        roles={roles}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        title="Eliminar usuario"
        message={`Se eliminara a "${deleting?.name}". Esta accion no se puede deshacer.`}
        confirmText="Eliminar"
      />
    </div>
  );
}
