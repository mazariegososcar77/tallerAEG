// Este archivo trae del servidor la lista de usuarios del sistema (las
// personas que pueden iniciar sesión en la app) para usarla en administración.
import { useState, useEffect, useCallback } from 'react';
import { usersApi } from '../api/usersApi.js';
import { notify } from '../lib/toast.js';

/** Trae la lista de usuarios del servidor y permite volver a cargarla cuando haga falta. */
export function useUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setUsers(await usersApi.list());
    } catch (err) {
      notify.error(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { users, loading, reload };
}
