// ============================================================================
// PANTALLA: Configuración → Catálogos
// AVISO: esta pantalla todavía NO hace nada. Es solo un aviso de "Próximamente
// / En construcción" (usa el componente ComingSoonPage). La idea a futuro es
// que sea un lugar centralizado para administrar catálogos del sistema, pero
// por ahora no hay ninguna funcionalidad real detrás de este menú.
// ============================================================================
import { ListChecks } from 'lucide-react';
import ComingSoonPage from './ComingSoonPage.jsx';

export default function CatalogsPage() {
  return (
    <ComingSoonPage
      icon={ListChecks}
      title="Catalogos"
      description="Administracion centralizada de catalogos del sistema. En construccion."
    />
  );
}
