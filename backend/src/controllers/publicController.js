// Este archivo recibe las peticiones PUBLICAS (sin sesion iniciada) relacionadas a los
// enlaces de firma remota: ver los datos minimos de un Reporte de Trabajo o de una Orden
// de Servicio por su token, y guardar la firma del cliente cuando se le pasa el telefono
// para que firme (mensajero que entrega un equipo, o tecnico en una visita de campo).
import * as workReportService from '../services/workReportService.js';
import * as serviceOrderService from '../services/serviceOrderService.js';
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

// Igual que los dos de arriba, pero para una Orden de Servicio (visita tecnica de campo).
export const getServiceOrderByToken = asyncHandler(async (req, res) => {
  res.json(await serviceOrderService.getPublicByToken(req.params.token));
});

export const setServiceOrderSignature = asyncHandler(async (req, res) => {
  const order = await serviceOrderService.setPublicClientSignature(req.params.token, req.body.name, req.file);
  res.json({ ok: true, client_signature_url: order.client_signature_url, client_signature_name: order.client_signature_name });
});
