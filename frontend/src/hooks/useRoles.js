// Este archivo trae del servidor la lista de roles de usuario (por ejemplo
// Administrador, Técnico) para usarla en las pantallas de administración.
import { useState, useEffect, useCallback } from 'react';
import { rolesApi } from '../api/rolesApi.js';
import { notify } from '../lib/toast.js';

/** Trae la lista de roles del servidor y permite volver a cargarla cuando haga falta. */
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
