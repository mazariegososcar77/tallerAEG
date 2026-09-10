// Este archivo trae del servidor el catálogo de "categorías de pieza" (usado
// al armar cotizaciones) para usarlo en los formularios.
import { useState, useEffect, useCallback } from 'react';
import { partCategoriesApi } from '../api/partCategoriesApi.js';
import { notify } from '../lib/toast.js';

/** Trae el catálogo de categorías de pieza del servidor y permite volver a cargarlo. */
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
