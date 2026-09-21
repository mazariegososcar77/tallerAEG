// Este archivo recibe las peticiones web relacionadas a la NUMERACION DE DOCUMENTOS
// (prefijo, digitos y siguiente numero de cotizaciones/ordenes/facturas/reportes).
import * as numberingService from '../services/numberingService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// Trae las 5 series (Configuracion > Numeracion de documentos).
export const list = asyncHandler(async (_req, res) => {
  res.json(await numberingService.list());
});
// Edita una serie (prefijo, digitos y/o el siguiente numero).
export const update = asyncHandler(async (req, res) => {
  res.json(await numberingService.update(req.params.documentType, req.body));
});
