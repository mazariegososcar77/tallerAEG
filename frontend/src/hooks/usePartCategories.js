import { useState, useEffect, useCallback } from 'react';
import { partCategoriesApi } from '../api/partCategoriesApi.js';
import { notify } from '../lib/toast.js';

/** Carga el catalogo de categorias de pieza y expone una funcion para recargar. */
export function usePartCategories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setCategories(await partCategoriesApi.list());
    } catch (err) {
      notify.error(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { categories, loading, reload };
}
