import { useClientTypes } from '../../hooks/useClientTypes.js';
import { clientTypesApi } from '../../api/clientTypesApi.js';
import CatalogManager from '../../components/config/CatalogManager.jsx';

export default function ClientTypesPage() {
  const { types, loading, reload } = useClientTypes();
  return (
    <CatalogManager
      title="Tipos de cliente"
      subtitle="Catalogo de tipos de cliente (particular, empresa, gobierno, etc.)"
      entityLabel="tipo de cliente"
      items={types}
      loading={loading}
      reload={reload}
      api={clientTypesApi}
      permPrefix="client-types"
    />
  );
}
