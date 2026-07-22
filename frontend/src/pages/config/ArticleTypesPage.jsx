// ============================================================================
// PANTALLA: Configuración → Tipos de Artículo
// Administra el catálogo de tipos de artículo del Inventario (por ejemplo:
// máquina, repuesto, electrónico, etc.). Aquí se pueden crear, editar,
// activar/desactivar y eliminar los tipos que luego aparecen como opción al
// dar de alta un artículo. Usa el componente reutilizable "CatalogManager"
// que ya trae la tabla, el formulario y los botones de acción.
// ============================================================================
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
      emoji={<Tags size={26} color="#CA8A04" />}
      permPrefix="article-types"
    />
  );
}
