// Este archivo trae la lista de clientes desde el servidor y la deja lista
// para mostrarla en pantalla. Si algo falla, muestra un aviso de error.
import { useState, useEffect, useCallback } from 'react';
import { clientsApi } from '../api/clientsApi.js';
import { notify } from '../lib/toast.js';

/** Trae la lista de clientes del servidor y permite volver a cargarla cuando haga falta. */
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
