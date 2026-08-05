// Este archivo trae del servidor la lista de "niveles de fidelización" de
// clientes (por ejemplo Oro, Plata, Bronce) para usarla en la app.
import { useState, useEffect, useCallback } from 'react';
import { loyaltyTiersApi } from '../api/loyaltyTiersApi.js';
import { notify } from '../lib/toast.js';

/** Trae la lista de niveles de fidelización del servidor y permite volver a cargarla. */
export function useLoyaltyTiers() {
  const [tiers, setTiers] = useState([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setTiers(await loyaltyTiersApi.list());
    } catch (err) {
      notify.error(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { tiers, loading, reload };
}
