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
      emoji={<Warehouse size={26} color="#E8551C" />}
      permPrefix="warehouses"
      withColor
    />
  );
}
