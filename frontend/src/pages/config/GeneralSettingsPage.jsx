// ============================================================================
// PANTALLA: Configuración → Configuración General
// AVISO: esta pantalla todavía NO hace nada. Es solo un aviso de "Próximamente
// / En construcción" (usa el componente ComingSoonPage). A futuro debería
// permitir ajustar datos del taller (nombre, logo, preferencias generales),
// pero hoy no hay ninguna funcionalidad real detrás de este menú.
// ============================================================================
import { SlidersHorizontal } from 'lucide-react';
import ComingSoonPage from './ComingSoonPage.jsx';

export default function GeneralSettingsPage() {
  return (
    <ComingSoonPage
      icon={SlidersHorizontal}
      title="Configuracion general"
      description="Ajustes generales del sistema (datos del taller, logo, preferencias). En construccion."
    />
  );
}
