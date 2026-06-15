import { useState, useEffect, useCallback } from 'react';
import { loyaltyTiersApi } from '../api/loyaltyTiersApi.js';
import { notify } from '../lib/toast.js';

/** Carga la lista de niveles de fidelizacion y expone una funcion para recargar. */
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
