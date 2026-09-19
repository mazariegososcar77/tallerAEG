/**
 * NUMERACION DE DOCUMENTOS.
 *
 * Centraliza el correlativo de los 5 documentos que llevan un numero propio
 * (cotizacion, orden de trabajo, orden de servicio, factura, reporte de
 * trabajo): antes cada uno calculaba su `MAX(number)+1` por su cuenta, sin
 * prefijo y sin forma de editarlo a mano. Ahora viven como una fila cada uno
 * en `document_series` (ver migracion 042), y este archivo es la fuente de
 * verdad de que tipos existen (`DOCUMENT_TYPES` de abajo) -- igual que
 * SETTINGS_SCHEMA lo es para system_settings.
 *
 * Los servicios de cada documento (quoteService, workOrderService, etc.) ya
 * no calculan su propio numero: piden `getNextNumber('quote')` aqui.
 */
import * as documentSeriesRepository from '../repositories/documentSeriesRepository.js';
import { ApiError } from '../utils/ApiError.js';

// Los 5 tipos de documento validos, con su nombre para mostrar en pantalla
// (por si algun tipo no llegara a tener fila en la base todavia).
export const DOCUMENT_TYPES = {
  quote:         'Cotizaciones',
  work_order:    'Ordenes de Trabajo',
  service_order: 'Ordenes de Servicio',
  invoice:       'Facturas',
  work_report:   'Reportes de Trabajo',
};

/** Devuelve las 5 series, en el orden fijo de DOCUMENT_TYPES (no el que devuelva MySQL). */
export async function list() {
  const rows = await documentSeriesRepository.getAll();
  const byType = Object.fromEntries(rows.map((r) => [r.document_type, r]));
  return Object.keys(DOCUMENT_TYPES).map((type) => byType[type] || {
    document_type: type, label: DOCUMENT_TYPES[type], prefix: '', digits: 4, next_number: 1,
  });
}

/**
 * Edita una serie (prefijo, cantidad de digitos y/o el siguiente numero).
 * `next_number` es a proposito lo unico "peligroso" que se deja editar: es
 * el escape para asignar manualmente el numero de un documento (ej. seguir
 * la numeracion de un talonario fisico, o corregir una base de desarrollo).
 */
export async function update(documentType, patch) {
  if (!DOCUMENT_TYPES[documentType]) throw new ApiError(404, 'Tipo de documento desconocido');
  return documentSeriesRepository.update(documentType, patch);
}

/** Toma el siguiente numero de una serie (ya formateado) y avanza el contador. */
export async function getNextNumber(documentType) {
  if (!DOCUMENT_TYPES[documentType]) throw new ApiError(404, 'Tipo de documento desconocido');
  return documentSeriesRepository.takeNextNumber(documentType);
}
