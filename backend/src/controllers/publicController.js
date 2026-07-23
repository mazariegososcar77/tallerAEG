// Este archivo recibe las peticiones PUBLICAS (sin sesion iniciada) relacionadas al
// enlace de firma remota: ver los datos minimos de un reporte por su token, y guardar
// la firma del cliente cuando el mensajero le pasa el telefono para que firme.
import * as workReportService from '../services/workReportService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// Trae los datos minimos del reporte para mostrar en la pantalla publica de firma
// (numero de reporte/orden, equipo, cliente, y si ya esta firmado).
export const getWorkReportByToken = asyncHandler(async (req, res) => {
  res.json(await workReportService.getPublicByToken(req.params.token));
});

// Guarda la firma del cliente dibujada en la pantalla publica.
export const setWorkReportSignature = asyncHandler(async (req, res) => {
  const report = await workReportService.setPublicClientSignature(req.params.token, req.body.name, req.file);
  res.json({ ok: true, client_signature_url: report.client_signature_url, client_signature_name: report.client_signature_name });
});
