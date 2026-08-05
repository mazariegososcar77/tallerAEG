// Este archivo trae del servidor la lista de "tipos de artículo" (el catálogo que
// se configura en Configuración) y la deja lista para usar en los formularios.
import { useState, useEffect, useCallback } from 'react';
import { articleTypesApi } from '../api/articleTypesApi.js';
import { notify } from '../lib/toast.js';

/** Trae la lista de tipos de artículo del servidor y permite volver a cargarla. */
export function useArticleTypes() {
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setTypes(await articleTypesApi.list());
    } catch (err) {
      notify.error(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { types, loading, reload };
}
