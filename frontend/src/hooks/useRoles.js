import { useState, useEffect, useCallback } from 'react';
import { rolesApi } from '../api/rolesApi.js';
import { notify } from '../lib/toast.js';

/** Carga la lista de roles y expone una funcion para recargar. */
export function useRoles() {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setRoles(await rolesApi.list());
    } catch (err) {
      notify.error(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { roles, loading, reload };
}
