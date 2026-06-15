import { useState, useEffect, useCallback } from 'react';
import { articlesApi } from '../api/articlesApi.js';
import { notify } from '../lib/toast.js';

/** Carga la lista de articulos y expone una funcion para recargar. */
export function useArticles() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setArticles(await articlesApi.list());
    } catch (err) {
      notify.error(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { articles, loading, reload };
}
