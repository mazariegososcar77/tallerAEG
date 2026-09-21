// Este archivo maneja la NUMERACION DE DOCUMENTOS (prefijo, digitos y siguiente
// numero de cada tipo de documento correlativo: cotizacion, orden de trabajo,
// orden de servicio, factura, reporte de trabajo). Se administra desde Configuracion.
import { client } from './client.js';

export const documentSeriesApi = {
  list: () => client.get('/document-series').then((r) => r.data),
  update: (documentType, payload) => client.put(`/document-series/${documentType}`, payload).then((r) => r.data),
};
