// Este archivo recibe las peticiones web relacionadas a REPORTES DE TRABAJO: la
// documentación fotográfica de una orden (fotos y notas por etapa, firmas del técnico y del
// cliente, finalizarlo y descargar su PDF).
import * as workReportService from '../services/workReportService.js';
import { generarReportePDF } from '../utils/pdfGenerator.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// Cuando el usuario abre la pantalla de Reportes, esto trae la lista completa.
export const list = asyncHandler(async (_req, res) => {
  res.json(await workReportService.list());
});

// Trae los datos completos de un reporte de trabajo en particular.
export const getById = asyncHandler(async (req, res) => {
  res.json(await workReportService.getById(req.params.id));
});

// Cuando el usuario presiona el botón "Reporte" de una orden de trabajo, esto crea el
// reporte para esa orden (si ya existía uno, simplemente lo devuelve, no crea otro).
export const createForOrder = asyncHandler(async (req, res) => {
  const report = await workReportService.createForOrder(req.body.work_order_id);
  res.status(201).json(report);
});

// Cuando el usuario guarda las notas de un reporte, esto las actualiza. Si el reporte ya
// está finalizado, solo se puede editar con el permiso especial de forzar edición.
export const update = asyncHandler(async (req, res) => {
  const canForceEdit = req.user.permissions.includes('work-reports.force-edit');
  res.json(await workReportService.update(req.params.id, req.body, canForceEdit));
});

// Cuando el usuario sube una foto a una etapa del reporte, esto la guarda.
export const addPhoto = asyncHandler(async (req, res) => {
  const canForceEdit = req.user.permissions.includes('work-reports.force-edit');
  const photo = await workReportService.addPhoto(req.params.id, req.body, req.file, canForceEdit);
  res.status(201).json(photo);
});

// Cuando el usuario borra una foto del reporte, esto la elimina.
export const removePhoto = asyncHandler(async (req, res) => {
  const canForceEdit = req.user.permissions.includes('work-reports.force-edit');
  await workReportService.removePhoto(req.params.id, req.params.photoId, canForceEdit);
  res.status(204).end();
});

// Cuando el técnico o el cliente firman en la pantalla (dibujando su firma), esto la guarda junto con su nombre.
export const setSignature = asyncHandler(async (req, res) => {
  const canForceEdit = req.user.permissions.includes('work-reports.force-edit');
  const report = await workReportService.setSignature(
    req.params.id, req.body.role, req.body.name, req.file, canForceEdit
  );
  res.json(report);
});

// Cuando el usuario presiona "Finalizar Reporte", esto lo cierra (si le faltan fotos, notas
// o firmas obligatorias avisa qué falta) y genera automáticamente la factura correspondiente.
export const finalize = asyncHandler(async (req, res) => {
  res.json(await workReportService.finalize(req.params.id));
});

// Cuando el usuario borra un reporte, esto lo elimina.
export const remove = asyncHandler(async (req, res) => {
  await workReportService.remove(req.params.id);
  res.status(204).end();
});

// Cuando el usuario descarga el PDF de un reporte, esto genera el archivo (con fotos y firmas) y se lo envía.
export const pdf = asyncHandler(async (req, res) => {
  const report = await workReportService.getById(req.params.id);
  const doc = generarReportePDF(report);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="reporte-${report.number}.pdf"`);
  doc.pipe(res);
  doc.end();
});
