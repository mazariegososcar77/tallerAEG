// Este archivo recibe las peticiones PUBLICAS (sin sesion iniciada) relacionadas a los
// enlaces de firma remota: ver los datos minimos de un Reporte de Trabajo o de una Orden
// de Servicio por su token, y guardar la firma del cliente cuando se le pasa el telefono
// para que firme (mensajero que entrega un equipo, o tecnico en una visita de campo).
import * as workReportService from '../services/workReportService.js';
import * as serviceOrderService from '../services/serviceOrderService.js';
import * as uploadService from '../services/uploadService.js';
import { resolverCampos } from '../lib/mediaUrl.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// Trae los datos minimos del reporte para mostrar en la pantalla publica de firma
// (numero de reporte/orden, equipo, cliente, y si ya esta firmado).
export const getWorkReportByToken = asyncHandler(async (req, res) => {
  const report = await workReportService.getPublicByToken(req.params.token);
  res.json(await resolverCampos(report, ['client_signature_url']));
});

// Guarda la firma del cliente dibujada en la pantalla publica.
export const setWorkReportSignature = asyncHandler(async (req, res) => {
  const report = await workReportService.setPublicClientSignature(
    req.params.token, req.body.name, req.file, req.body.object_path
  );
  const { client_signature_url } = await resolverCampos(report, ['client_signature_url']);
  res.json({ ok: true, client_signature_url, client_signature_name: report.client_signature_name });
});

// Igual que los dos de arriba, pero para una Orden de Servicio (visita tecnica de campo).
export const getServiceOrderByToken = asyncHandler(async (req, res) => {
  const order = await serviceOrderService.getPublicByToken(req.params.token);
  res.json(await resolverCampos(order, ['client_signature_url']));
});

export const setServiceOrderSignature = asyncHandler(async (req, res) => {
  const order = await serviceOrderService.setPublicClientSignature(
    req.params.token, req.body.name, req.file, req.body.object_path
  );
  const { client_signature_url } = await resolverCampos(order, ['client_signature_url']);
  res.json({ ok: true, client_signature_url, client_signature_name: order.client_signature_name });
});

/**
 * Permiso de subida de la firma desde el enlace publico (sin sesion).
 *
 * Aqui no hay usuario ni permisos que revisar: la autorizacion es el token largo y
 * aleatorio de la URL, exactamente igual que para guardar la firma. Por eso lo
 * primero es confirmar que ese token corresponde a un documento real -- si no,
 * cualquiera podria pedirle al sistema URLs firmadas para escribir en el bucket.
 * Solo se firma una subida de firma (PNG); ninguna otra entidad se expone aca.
 */
const subidaFirmaPublica = (existePorToken) => asyncHandler(async (req, res) => {
  if (!(await existePorToken(req.params.token))) {
    throw new ApiError(404, 'Enlace invalido o vencido');
  }
  res.json(await uploadService.crearSubidaFirmaPublica(req.body));
});

export const crearSubidaFirmaReporte = subidaFirmaPublica(workReportService.existePorTokenPublico);
export const crearSubidaFirmaOrdenServicio = subidaFirmaPublica(serviceOrderService.existePorTokenPublico);
