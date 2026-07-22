// ============================================================================
// PANTALLA: Configuración → Parámetros del Sistema
// AVISO: esta pantalla todavía NO hace nada. Es solo un aviso de "Próximamente
// / En construcción" (usa el componente ComingSoonPage). A futuro debería
// permitir ajustar valores configurables que afectan el comportamiento del
// sistema, pero hoy no hay ninguna funcionalidad real detrás de este menú.
// ============================================================================
import { Cog } from 'lucide-react';
import ComingSoonPage from './ComingSoonPage.jsx';

export default function SystemParamsPage() {
  return (
    <ComingSoonPage
      icon={Cog}
      title="Parametros del sistema"
      description="Parametros y valores configurables que afectan el comportamiento del sistema. En construccion."
    />
  );
}
