import { Tags } from "lucide-react";
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
      emoji={<Tags size={26} color="#E8551C" />}
      permPrefix="article-types"
    />
  );
}
