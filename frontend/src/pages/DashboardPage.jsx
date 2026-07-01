import { useIsMobile } from '../hooks/useIsMobile.js';
import { useAuth } from '../hooks/useAuth.js';
import MaintenanceCalendar from '../components/dashboard/MaintenanceCalendar.jsx';
import UpcomingSummary from '../components/dashboard/UpcomingSummary.jsx';

const C = { muted:'var(--c-muted)' };

export default function DashboardPage() {
  const { hasPermission } = useAuth();
  const isMobile = useIsMobile();

  if (!hasPermission('dashboard.view')) {
    return (
      <div style={{ padding:'4px 0' }}>
        <p style={{ fontSize:11, fontWeight:800, color:C.muted, textTransform:'uppercase', letterSpacing:1 }}>Panel de administracion — Taller AEG</p>
      </div>
    );
  }

  return (
    <div style={{ padding:'4px 0' }}>
      <p style={{ fontSize:11, fontWeight:800, color:C.muted, textTransform:'uppercase', letterSpacing:1, marginBottom:12 }}>Panel de administracion — Taller AEG</p>

      <div style={{ display:'grid', gap:20, alignItems:'stretch', gridTemplateColumns: isMobile ? '1fr' : 'minmax(300px, 380px) 1fr' }}>
        {/* Resumen de próximas fechas (mantenimientos y entregas de órdenes) */}
        <UpcomingSummary />

        {/* Calendario (vista principal) */}
        <MaintenanceCalendar />
      </div>
    </div>
  );
}
