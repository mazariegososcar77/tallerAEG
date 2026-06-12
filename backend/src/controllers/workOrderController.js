import * as workOrderService from '../services/workOrderService.js';
import { generarOrdenTrabajoPDF } from '../utils/pdfGenerator.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const list = asyncHandler(async (_req, res) => {
  res.json(await workOrderService.list());
});

export const getById = asyncHandler(async (req, res) => {
  res.json(await workOrderService.getById(req.params.id));
});

export const create = asyncHandler(async (req, res) => {
  res.status(201).json(await workOrderService.create(req.body));
});

export const update = asyncHandler(async (req, res) => {
  res.json(await workOrderService.update(req.params.id, req.body));
});

export const updateStatus = asyncHandler(async (req, res) => {
  res.json(await workOrderService.updateStatus(req.params.id, req.body.status));
});

export const remove = asyncHandler(async (req, res) => {
  await workOrderService.remove(req.params.id);
  res.status(204).end();
});

export const pdf = asyncHandler(async (req, res) => {
  const order = await workOrderService.getById(req.params.id);
  const doc = generarOrdenTrabajoPDF(order);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="orden-${order.number}.pdf"`);
  doc.pipe(res);
  doc.end();
});
