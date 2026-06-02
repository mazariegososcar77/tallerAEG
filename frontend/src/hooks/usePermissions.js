import { useState, useEffect, useCallback } from 'react';
import { permissionsApi } from '../api/permissionsApi.js';
import { notify } from '../lib/toast.js';

/** Carga el catalogo de permisos. */
export function usePermissions() {
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setPermissions(await permissionsApi.list());
    } catch (err) {
      notify.error(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { permissions, loading, reload };
}
