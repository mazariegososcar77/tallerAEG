import { useMemo } from 'react';
import { KeyRound } from 'lucide-react';
import { usePermissions } from '../../hooks/usePermissions.js';
import PageHeader from '../../components/common/PageHeader.jsx';
import Card from '../../components/ui/Card.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';

export default function PermissionsPage() {
  const { permissions, loading } = usePermissions();

  // Agrupa por modulo para mostrar el catalogo ordenado.
  const groups = useMemo(() => {
    const map = {};
    for (const p of permissions) {
      (map[p.module] ||= []).push(p);
    }
    return map;
  }, [permissions]);

  return (
    <div>
      <PageHeader title="Permisos" subtitle="Catalogo de permisos del sistema (solo lectura)" />

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner size={28} className="text-orange-500" />
        </div>
      ) : permissions.length === 0 ? (
        <EmptyState icon={KeyRound} title="Sin permisos" message="No hay permisos en el catalogo." />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {Object.entries(groups).map(([module, perms]) => (
            <Card key={module} className="p-5">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-semibold text-navy-800">{module}</h3>
                <Badge variant="navy">{perms.length}</Badge>
              </div>
              <ul className="space-y-2">
                {perms.map((p) => (
                  <li key={p.id} className="flex items-start justify-between gap-3 text-sm">
                    <span className="text-navy-700">{p.description}</span>
                    <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">{p.code}</code>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
