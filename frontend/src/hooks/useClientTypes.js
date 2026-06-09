import { useState, useEffect, useCallback } from 'react';
import { clientTypesApi } from '../api/clientTypesApi.js';
import { notify } from '../lib/toast.js';

/** Carga la lista de tipos de cliente y expone una funcion para recargar. */
export function useClientTypes() {
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setTypes(await clientTypesApi.list());
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
