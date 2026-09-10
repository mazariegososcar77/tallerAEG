// ============================================================================
// PANTALLA: Configuración → Bodegas
// Administra el catálogo de bodegas del Inventario (los lugares físicos
// donde se guardan los artículos). Permite crear, editar (incluyendo un
// color distintivo), activar/desactivar y eliminar bodegas. Usa el
// componente reutilizable "CatalogManager".
// ============================================================================
import { Warehouse } from "lucide-react";
import { useWarehouses } from '../../hooks/useWarehouses.js';
import { warehousesApi } from '../../api/warehousesApi.js';
import CatalogManager from '../../components/config/CatalogManager.jsx';

export default function WarehousesPage() {
  const { warehouses, loading, reload } = useWarehouses();
  return (
    <CatalogManager
      title="Bodegas"
      subtitle="Catalogo de bodegas del inventario"
      entityLabel="bodega"
      items={warehouses}
      loading={loading}
      reload={reload}
      api={warehousesApi}
      emoji={<Warehouse size={26} color="var(--c-accent)" />}
      permPrefix="warehouses"
      withColor
    />
  );
}
