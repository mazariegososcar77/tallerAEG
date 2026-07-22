// Este archivo trae del servidor la lista completa de permisos que existen en
// el sistema (usada, por ejemplo, al configurar qué puede hacer cada rol).
import { useState, useEffect, useCallback } from 'react';
import { permissionsApi } from '../api/permissionsApi.js';
import { notify } from '../lib/toast.js';

/** Trae del servidor el catálogo de permisos disponibles en el sistema. */
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
