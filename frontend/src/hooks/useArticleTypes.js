import { useState, useEffect, useCallback } from 'react';
import { articleTypesApi } from '../api/articleTypesApi.js';
import { notify } from '../lib/toast.js';

/** Carga la lista de tipos de articulo y expone una funcion para recargar. */
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
