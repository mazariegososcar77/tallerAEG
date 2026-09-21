// Este archivo trae del servidor la lista de "tipos de trabajo" (el catálogo que se
// configura en Configuración) y la deja lista para usar en los formularios.
import { useState, useEffect, useCallback } from 'react';
import { workTypesApi } from '../api/workTypesApi.js';
import { notify } from '../lib/toast.js';

/** Trae la lista de tipos de trabajo del servidor y permite volver a cargarla. */
export function useWorkTypes() {
  const [workTypes, setWorkTypes] = useState([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setWorkTypes(await workTypesApi.list());
    } catch (err) {
      notify.error(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { workTypes, loading, reload };
}
