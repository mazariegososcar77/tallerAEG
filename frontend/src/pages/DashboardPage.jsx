import { useState, useEffect } from 'react';
import { Users, ShieldCheck, KeyRound } from 'lucide-react';
import { useAuth } from '../hooks/useAuth.js';
import { usersApi } from '../api/usersApi.js';
import { rolesApi } from '../api/rolesApi.js';
import { permissionsApi } from '../api/permissionsApi.js';
import { notify } from '../lib/toast.js';
import Card from '../components/ui/Card.jsx';
import PageHeader from '../components/common/PageHeader.jsx';

function StatCard({ icon: Icon, label, value, accent }) {
  return (
    <Card className="flex items-center gap-4 p-5">
      <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${accent}`}>
        <Icon size={24} />
      </div>
      <div>
        <p className="text-sm text-slate-500">{label}</p>
        <p className="text-2xl font-bold text-navy-800">{value ?? '—'}</p>
      </div>
    </Card>
  );
}

export default function DashboardPage() {
  const { user, hasPermission } = useAuth();
  const [stats, setStats] = useState({ users: null, roles: null, permissions: null });

  useEffect(() => {
    const load = async () => {
      const next = {};
      if (hasPermission('users.view')) next.users = (await usersApi.list()).length;
      if (hasPermission('roles.view')) next.roles = (await rolesApi.list()).length;
      if (hasPermission('permissions.view')) next.permissions = (await permissionsApi.list()).length;
      setStats((prev) => ({ ...prev, ...next }));
    };
    load().catch((err) => notify.error(err.message));
  }, [hasPermission]);

  return (
    <div>
      <PageHeader title={`Hola, ${user?.name?.split(' ')[0] || ''}`} subtitle="Resumen del sistema" />

      {/* Banner de bienvenida */}
      <Card className="mb-6 overflow-hidden">
        <div className="bg-gradient-to-r from-navy-700 to-navy-600 p-6 text-white">
          <h2 className="text-xl font-semibold">Panel de administracion</h2>
          <p className="mt-1 text-navy-100">
            Tu rol actual es <span className="font-semibold text-orange-300">{user?.role?.name}</span>.
          </p>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {hasPermission('users.view') && (
          <StatCard icon={Users} label="Usuarios" value={stats.users} accent="bg-orange-100 text-orange-600" />
        )}
        {hasPermission('roles.view') && (
          <StatCard icon={ShieldCheck} label="Roles" value={stats.roles} accent="bg-navy-100 text-navy-700" />
        )}
        {hasPermission('permissions.view') && (
          <StatCard icon={KeyRound} label="Permisos" value={stats.permissions} accent="bg-orange-100 text-orange-600" />
        )}
      </div>
    </div>
  );
}
