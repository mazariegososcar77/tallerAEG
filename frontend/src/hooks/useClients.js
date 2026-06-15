import { useState, useEffect, useCallback } from 'react';
import { clientsApi } from '../api/clientsApi.js';
import { notify } from '../lib/toast.js';

/** Carga la lista de clientes y expone una funcion para recargar. */
export function useClients() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setClients(await clientsApi.list());
    } catch (err) {
      notify.error(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { clients, loading, reload };
}
