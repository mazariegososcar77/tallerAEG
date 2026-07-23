// Este archivo trae la lista de artículos (inventario) desde el servidor y la
// deja lista para mostrarla en pantalla. Si algo falla, muestra un aviso de error.
import { useState, useEffect, useCallback } from 'react';
import { articlesApi } from '../api/articlesApi.js';
import { notify } from '../lib/toast.js';

/** Trae la lista de artículos del servidor y permite volver a cargarla cuando haga falta. */
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
