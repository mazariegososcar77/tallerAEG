// ============================================================================
// PANTALLA: Configuración → Tipos de equipo
// Administra el catálogo de tipos de equipo (Motor trifásico, Bomba sumergible, ...) que
// alimenta las casillas "Tipo de equipo" de las Órdenes de Trabajo y de Servicio. Cada
// tipo pertenece a una categoría (Motores, Bombas, Otros...) y así se agrupan en el
// formulario. Usa el componente reutilizable "CatalogManager" (con categoría, sin
// descripción).
// ============================================================================
import { Cog } from 'lucide-react';
import { useEquipmentTypes } from '../../hooks/useEquipmentTypes.js';
import { equipmentTypesApi } from '../../api/equipmentTypesApi.js';
import CatalogManager from '../../components/config/CatalogManager.jsx';

export default function EquipmentTypesPage() {
  const { equipmentTypes, loading, reload } = useEquipmentTypes();
  return (
    <CatalogManager
      title="Tipos de equipo"
      subtitle="Casillas 'Tipo de equipo' de las Ordenes de Trabajo y de Servicio, agrupadas por categoria"
      entityLabel="tipo de equipo"
      items={equipmentTypes}
      loading={loading}
      reload={reload}
      api={equipmentTypesApi}
      emoji={<Cog size={26} color="var(--c-accent)" />}
      permPrefix="equipment-types"
      withCategory
      withDescription={false}
    />
  );
}
