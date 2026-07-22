import * as workReportService from '../services/workReportService.js';
import { generarReportePDF } from '../utils/pdfGenerator.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const list = asyncHandler(async (_req, res) => {
  res.json(await workReportService.list());
});

export const getById = asyncHandler(async (req, res) => {
  res.json(await workReportService.getById(req.params.id));
});

export const createForOrder = asyncHandler(async (req, res) => {
  const report = await workReportService.createForOrder(req.body.work_order_id);
  res.status(201).json(report);
});

export const update = asyncHandler(async (req, res) => {
  const canForceEdit = req.user.permissions.includes('work-reports.force-edit');
  res.json(await workReportService.update(req.params.id, req.body, canForceEdit));
});

export const addPhoto = asyncHandler(async (req, res) => {
  const canForceEdit = req.user.permissions.includes('work-reports.force-edit');
  const photo = await workReportService.addPhoto(req.params.id, req.body, req.file, canForceEdit);
  res.status(201).json(photo);
});

export const removePhoto = asyncHandler(async (req, res) => {
  const canForceEdit = req.user.permissions.includes('work-reports.force-edit');
  await workReportService.removePhoto(req.params.id, req.params.photoId, canForceEdit);
  res.status(204).end();
});

export const setSignature = asyncHandler(async (req, res) => {
  const canForceEdit = req.user.permissions.includes('work-reports.force-edit');
  const report = await workReportService.setSignature(
    req.params.id, req.body.role, req.body.name, req.file, canForceEdit
  );
  res.json(report);
});

export const finalize = asyncHandler(async (req, res) => {
  res.json(await workReportService.finalize(req.params.id));
});

export const remove = asyncHandler(async (req, res) => {
  await workReportService.remove(req.params.id);
  res.status(204).end();
});

export const pdf = asyncHandler(async (req, res) => {
  const report = await workReportService.getById(req.params.id);
  const doc = generarReportePDF(report);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="reporte-${report.number}.pdf"`);
  doc.pipe(res);
  doc.end();
});
