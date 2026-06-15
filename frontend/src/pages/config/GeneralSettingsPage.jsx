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
