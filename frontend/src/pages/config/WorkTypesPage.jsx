// ============================================================================
// PANTALLA: Configuración → Tipos de Trabajo
// Administra el catálogo de tipos de trabajo (Rebobinado, Mantenimiento,
// Reparación, ...) que alimenta el selector "Tipo de trabajo" de Cotizaciones
// y Órdenes de Trabajo. Antes era una lista fija en el código; ahora se puede
// crear, editar, activar/desactivar y eliminar desde aquí. Usa el componente
// reutilizable "CatalogManager" que ya trae la tabla, el formulario y los
// botones de acción.
// ============================================================================
import { Wrench } from "lucide-react";
import { useWorkTypes } from '../../hooks/useWorkTypes.js';
import { workTypesApi } from '../../api/workTypesApi.js';
import CatalogManager from '../../components/config/CatalogManager.jsx';

export default function WorkTypesPage() {
  const { workTypes, loading, reload } = useWorkTypes();
  return (
    <CatalogManager
      title="Tipos de trabajo"
      subtitle="Catalogo del selector 'Tipo de trabajo' de Cotizaciones y Ordenes de Trabajo"
      entityLabel="tipo de trabajo"
      items={workTypes}
      loading={loading}
      reload={reload}
      api={workTypesApi}
      emoji={<Wrench size={26} color="var(--c-accent)" />}
      permPrefix="work-types"
    />
  );
}
