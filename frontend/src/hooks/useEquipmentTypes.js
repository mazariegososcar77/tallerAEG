// Este archivo trae del servidor el catalogo de "tipos de equipo" (con su categoria) que se
// configura en Configuracion y lo deja listo para las casillas de las ordenes.
import { useState, useEffect, useCallback } from 'react';
import { equipmentTypesApi } from '../api/equipmentTypesApi.js';
import { notify } from '../lib/toast.js';

/**
 * Trae la lista de tipos de equipo. `quiet` evita el aviso de error: los formularios de las
 * ordenes lo usan asi porque, si el catalogo no carga (por ejemplo, un rol sin permiso),
 * caen en la lista fija de siempre y el usuario puede seguir trabajando.
 */
export function useEquipmentTypes({ quiet = false } = {}) {
  const [equipmentTypes, setEquipmentTypes] = useState([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setEquipmentTypes(await equipmentTypesApi.list());
    } catch (err) {
      if (!quiet) notify.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [quiet]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { equipmentTypes, loading, reload };
}
