import { useState, useEffect, useCallback } from 'react';
import { warehousesApi } from '../api/warehousesApi.js';
import { notify } from '../lib/toast.js';

/** Carga la lista de bodegas y expone una funcion para recargar. */
export function useWarehouses() {
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setWarehouses(await warehousesApi.list());
    } catch (err) {
      notify.error(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { warehouses, loading, reload };
}
