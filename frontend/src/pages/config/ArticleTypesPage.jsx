import { useArticleTypes } from '../../hooks/useArticleTypes.js';
import { articleTypesApi } from '../../api/articleTypesApi.js';
import CatalogManager from '../../components/config/CatalogManager.jsx';

export default function ArticleTypesPage() {
  const { types, loading, reload } = useArticleTypes();
  return (
    <CatalogManager
      title="Tipos de articulo"
      subtitle="Catalogo de tipos (maquina, repuesto, electronico, ...)"
      entityLabel="tipo"
      items={types}
      loading={loading}
      reload={reload}
      api={articleTypesApi}
      permPrefix="article-types"
    />
  );
}
