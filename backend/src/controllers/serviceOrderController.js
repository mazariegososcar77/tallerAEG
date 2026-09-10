// Este archivo recibe las peticiones web relacionadas a ÓRDENES DE SERVICIO (el formato de
// visita técnica de campo: bombas/pozos en sitio del cliente): verlas, crearlas, editarlas,
// cambiar su estado, borrarlas, firmarlas, generar su enlace publico de firma remota y
// descargar el PDF.
import * as serviceOrderService from '../services/serviceOrderService.js';
import { generarOrdenServicioPDF } from '../utils/pdfGenerator.js';
import * as settingsService from '../services/settingsService.js';
import { resolverCampos, prepararLocales, limpiarLocales } from '../lib/mediaUrl.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// Las firmas pueden estar en la nube o en el disco de siempre; esto las deja como
// una direccion que el navegador pueda abrir (ver lib/mediaUrl.js).
const conFirmas = (datos) => resolverCampos(datos, ['tech_signature_url', 'client_signature_url']);

// Cuando el usuario abre la pantalla de Órdenes de Servicio, esto trae la lista completa.
export const list = asyncHandler(async (_req, res) => {
  res.json(await conFirmas(await serviceOrderService.list()));
});

// Trae los datos completos de una orden de servicio en particular.
export const getById = asyncHandler(async (req, res) => {
  res.json(await conFirmas(await serviceOrderService.getById(req.params.id)));
});

// Cuando el usuario guarda una orden de servicio nueva desde el formulario, esto la recibe y la manda a guardar.
export const create = asyncHandler(async (req, res) => {
  res.status(201).json(await serviceOrderService.create(req.body));
});

// Cuando el usuario edita una orden de servicio y guarda los cambios, esto los aplica.
export const update = asyncHandler(async (req, res) => {
  res.json(await serviceOrderService.update(req.params.id, req.body));
});

// Cuando el usuario cambia el estado de una orden de servicio, esto lo actualiza.
export const updateStatus = asyncHandler(async (req, res) => {
  res.json(await serviceOrderService.updateStatus(req.params.id, req.body.status));
});

// Cuando el usuario borra una orden de servicio, esto la elimina.
export const remove = asyncHandler(async (req, res) => {
  await serviceOrderService.remove(req.params.id);
  res.status(204).end();
});

// Cuando el tecnico firma en la pantalla (dibujando su firma) o guarda la firma del
// cliente capturada en persona, esto la guarda junto con su nombre.
export const setSignature = asyncHandler(async (req, res) => {
  const order = await serviceOrderService.setSignature(
    req.params.id, req.body.role, req.body.name, req.file, req.body.object_path
  );
  res.json(await conFirmas(order));
});

// Genera (o devuelve el ya existente) el enlace publico de firma remota, para cuando el
// cliente no puede firmar en el momento en la app.
export const getSigningLink = asyncHandler(async (req, res) => {
  const token = await serviceOrderService.getSigningLink(req.params.id);
  res.json({ token });
});

// Cuando el usuario descarga el PDF de una orden de servicio, esto genera el archivo y se lo envía.
// Ojo: aqui se usa la orden SIN resolver (la ruta tal como esta en la base), porque
// pdfkit embebe archivos y no URLs. Las firmas que viven en la nube se bajan antes a
// un temporal y se borran al terminar -- mismo criterio que el PDF del reporte.
export const pdf = asyncHandler(async (req, res) => {
  const order = await serviceOrderService.getById(req.params.id);
  const locales = await prepararLocales([order.tech_signature_url, order.client_signature_url]);
  const doc = generarOrdenServicioPDF(order, await settingsService.getSettings(), locales);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="orden-servicio-${order.number}.pdf"`);
  doc.pipe(res);
  doc.on('end', () => limpiarLocales(locales));
  doc.end();
});
