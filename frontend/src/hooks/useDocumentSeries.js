// Este archivo trae del servidor las 5 series de numeracion de documentos
// (cotizacion, orden de trabajo, orden de servicio, factura, reporte de trabajo).
import { useState, useEffect, useCallback } from 'react';
import { documentSeriesApi } from '../api/documentSeriesApi.js';
import { notify } from '../lib/toast.js';

export function useDocumentSeries() {
  const [series, setSeries] = useState([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setSeries(await documentSeriesApi.list());
    } catch (err) {
      notify.error(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { series, loading, reload };
}
