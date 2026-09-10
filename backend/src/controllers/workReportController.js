// Este archivo recibe las peticiones web relacionadas a REPORTES DE TRABAJO: la
// documentación fotográfica de una orden (fotos y notas por etapa, firmas del técnico y del
// cliente, finalizarlo y descargar su PDF).
import * as workReportService from '../services/workReportService.js';
import * as documentFlowService from '../services/documentFlowService.js';
import { generarReportePDF } from '../utils/pdfGenerator.js';
import * as settingsService from '../services/settingsService.js';
import { resolverCampos, resolverReporte, prepararLocales, limpiarLocales, valoresMediaReporte } from '../lib/mediaUrl.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// Cuando el usuario abre la pantalla de Reportes, esto trae la lista completa.
export const list = asyncHandler(async (_req, res) => {
  const reportes = await workReportService.list();
  res.json(await resolverCampos(reportes, ['tech_signature_url', 'client_signature_url', 'final_video_url']));
});

// Trae los datos completos de un reporte de trabajo en particular.
export const getById = asyncHandler(async (req, res) => {
  res.json(await resolverReporte(await workReportService.getById(req.params.id)));
});

// Cuando el usuario presiona el botón "Reporte" de una orden de trabajo o de servicio,
// esto crea el reporte para esa orden (si ya existía uno, simplemente lo devuelve, no
// crea otro). El schema de la ruta ya garantiza que viene exactamente uno de los dos ids.
export const create = asyncHandler(async (req, res) => {
  const report = req.body.work_order_id
    ? await workReportService.createForOrder(req.body.work_order_id)
    : await workReportService.createForServiceOrder(req.body.service_order_id);
  res.status(201).json(report);
});

// Cuando el usuario guarda las notas de un reporte, esto las actualiza. Si el reporte ya
// está finalizado, solo se puede editar con el permiso especial de forzar edición.
export const update = asyncHandler(async (req, res) => {
  const canForceEdit = req.user.permissions.includes('work-reports.force-edit');
  res.json(await workReportService.update(req.params.id, req.body, canForceEdit));
});

// Cuando el usuario sube una foto a una etapa del reporte, esto la guarda. La foto
// llega ya subida a la nube (el body trae su ruta) o como archivo multipart, segun
// este configurado el almacenamiento -- ver workReportService.addPhoto.
export const addPhoto = asyncHandler(async (req, res) => {
  const canForceEdit = req.user.permissions.includes('work-reports.force-edit');
  const photo = await workReportService.addPhoto(req.params.id, req.body, req.file, canForceEdit);
  res.status(201).json(await resolverCampos(photo, ['photo_url']));
});

// Cuando el usuario borra una foto del reporte, esto la elimina.
export const removePhoto = asyncHandler(async (req, res) => {
  const canForceEdit = req.user.permissions.includes('work-reports.force-edit');
  await workReportService.removePhoto(req.params.id, req.params.photoId, canForceEdit);
  res.status(204).end();
});

// Cuando el usuario sube (o reemplaza) el video final de prueba del reporte, esto lo comprime y lo guarda.
export const setVideo = asyncHandler(async (req, res) => {
  const canForceEdit = req.user.permissions.includes('work-reports.force-edit');
  const report = await workReportService.setVideo(req.params.id, req.file, canForceEdit);
  res.json(await resolverReporte(report));
});

// Cuando el usuario quita el video final de prueba del reporte, esto lo elimina.
export const removeVideo = asyncHandler(async (req, res) => {
  const canForceEdit = req.user.permissions.includes('work-reports.force-edit');
  const report = await workReportService.removeVideo(req.params.id, canForceEdit);
  res.json(await resolverReporte(report));
});

// Cuando el técnico o el cliente firman en la pantalla (dibujando su firma), esto la guarda junto con su nombre.
export const setSignature = asyncHandler(async (req, res) => {
  const canForceEdit = req.user.permissions.includes('work-reports.force-edit');
  const report = await workReportService.setSignature(
    req.params.id, req.body.role, req.body.name, req.file, canForceEdit, req.body.object_path
  );
  res.json(await resolverReporte(report));
});

// Genera (o devuelve el ya existente) el enlace publico de firma remota, para
// mandarlo al mensajero que entrega el equipo sin que el cliente este en el taller.
export const getSigningLink = asyncHandler(async (req, res) => {
  const token = await workReportService.getSigningLink(req.params.id);
  res.json({ token });
});

// Mapa de Relaciones: la cadena de documentos (Cotizacion -> Orden -> Reporte ->
// Factura) de la orden que documenta este reporte. 400 si el reporte es de una
// Orden de Servicio (no tiene cotizacion ni factura detras).
export const documentFlow = asyncHandler(async (req, res) => {
  res.json(await documentFlowService.getForWorkReport(req.params.id));
});

// Trae el material (repuestos e insumos) cargado en un reporte.
export const listItems = asyncHandler(async (req, res) => {
  res.json(await workReportService.listItems(req.params.id));
});

// Cuando el usuario agrega un material al reporte, esto lo guarda (si ese artículo ya
// estaba cargado, le suma la cantidad).
export const addItem = asyncHandler(async (req, res) => {
  const item = await workReportService.addItem(req.params.id, req.body);
  res.status(201).json(item);
});

// Cuando el usuario corrige la cantidad de un material ya cargado.
export const updateItem = asyncHandler(async (req, res) => {
  res.json(await workReportService.updateItem(req.params.id, req.params.itemId, req.body));
});

// Cuando el usuario quita un material del reporte.
export const removeItem = asyncHandler(async (req, res) => {
  await workReportService.removeItem(req.params.id, req.params.itemId);
  res.status(204).end();
});

// Cuando el usuario presiona "Finalizar Reporte", esto lo cierra (si le faltan fotos, notas
// o firmas obligatorias avisa qué falta), descuenta de bodega el material usado y genera
// automáticamente la factura correspondiente. Se registra quién lo hizo, porque el
// descuento de inventario queda a su nombre en el kardex.
export const finalize = asyncHandler(async (req, res) => {
  const resultado = await workReportService.finalize(req.params.id, req.user.id);
  res.json({ ...resultado, report: await resolverReporte(resultado.report) });
});

// Cuando un administrador reabre un reporte ya finalizado: lo devuelve a borrador y
// regresa a bodega el material que se había descontado.
export const reopen = asyncHandler(async (req, res) => {
  const resultado = await workReportService.reopen(req.params.id, req.user.id);
  res.json({ ...resultado, report: await resolverReporte(resultado.report) });
});

// Cuando el usuario borra un reporte, esto lo elimina.
export const remove = asyncHandler(async (req, res) => {
  await workReportService.remove(req.params.id);
  res.status(204).end();
});

/**
 * Cuando el usuario descarga el PDF de un reporte, esto genera el archivo (con fotos
 * y firmas) y se lo envía.
 *
 * Ojo con el orden: aqui se usa el reporte SIN resolver (con la ruta del objeto tal
 * como esta en la base), porque `pdfkit` embebe archivos y no sabe abrir una URL. Las
 * fotos que viven en la nube se bajan antes a un temporal del sistema -- en streaming,
 * nunca a memoria -- y se borran apenas el PDF termina de armarse. Es el unico punto
 * del sistema donde los bytes de una imagen vuelven a pasar por el servidor.
 */
export const pdf = asyncHandler(async (req, res) => {
  const report = await workReportService.getById(req.params.id);
  const locales = await prepararLocales(valoresMediaReporte(report));
  const doc = generarReportePDF(report, await settingsService.getSettings(), locales);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="reporte-${report.number}.pdf"`);
  doc.pipe(res);
  doc.on('end', () => limpiarLocales(locales));
  doc.end();
});
