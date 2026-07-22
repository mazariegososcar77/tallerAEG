import { ListChecks } from 'lucide-react';
import { usePartCategories } from '../../hooks/usePartCategories.js';
import { partCategoriesApi } from '../../api/partCategoriesApi.js';
import CatalogManager from '../../components/config/CatalogManager.jsx';

export default function PartCategoriesPage() {
  const { categories, loading, reload } = usePartCategories();
  return (
    <CatalogManager
      title="Categorias de Pieza"
      subtitle="Catalogo usado al dar de alta repuestos rapidos desde una cotizacion"
      entityLabel="categoria"
      items={categories}
      loading={loading}
      reload={reload}
      api={partCategoriesApi}
      emoji={<ListChecks size={26} color="#E8551C" />}
      permPrefix="part-categories"
      withPrefix
      withDescription={false}
    />
  );
}
