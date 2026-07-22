// Este archivo trae del servidor la lista de bodegas (los lugares físicos
// donde se guarda el inventario) para usarla en los formularios.
import { useState, useEffect, useCallback } from 'react';
import { warehousesApi } from '../api/warehousesApi.js';
import { notify } from '../lib/toast.js';

/** Trae la lista de bodegas del servidor y permite volver a cargarla cuando haga falta. */
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
