import { useState, useEffect, useCallback } from 'react';
import { usersApi } from '../api/usersApi.js';
import { notify } from '../lib/toast.js';

/** Carga la lista de usuarios y expone una funcion para recargar. */
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
