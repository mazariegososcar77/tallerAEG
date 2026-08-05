import * as invoiceService from '../services/invoiceService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const list = asyncHandler(async (_req, res) => {
  res.json(await invoiceService.list());
});

export const getById = asyncHandler(async (req, res) => {
  res.json(await invoiceService.getById(req.params.id));
});

export const create = asyncHandler(async (req, res) => {
  res.status(201).json(await invoiceService.create(req.body));
});

export const update = asyncHandler(async (req, res) => {
  res.json(await invoiceService.update(req.params.id, req.body));
});

export const remove = asyncHandler(async (req, res) => {
  await invoiceService.remove(req.params.id);
  res.status(204).end();
});

export const voidInvoice = asyncHandler(async (req, res) => {
  res.json(await invoiceService.voidInvoice(req.params.id, req.body.motivo));
});

export const certify = asyncHandler(async (req, res) => {
  res.json(await invoiceService.certify(req.params.id));
});
