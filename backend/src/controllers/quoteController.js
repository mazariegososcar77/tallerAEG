import * as quoteService from '../services/quoteService.js';
import { generarCotizacionPDF } from '../utils/pdfGenerator.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const list = asyncHandler(async (_req, res) => {
  res.json(await quoteService.list());
});

export const getById = asyncHandler(async (req, res) => {
  res.json(await quoteService.getById(req.params.id));
});

export const create = asyncHandler(async (req, res) => {
  res.status(201).json(await quoteService.create(req.body));
});

export const update = asyncHandler(async (req, res) => {
  res.json(await quoteService.update(req.params.id, req.body));
});

export const updateStatus = asyncHandler(async (req, res) => {
  res.json(await quoteService.updateStatus(req.params.id, req.body.status));
});

export const remove = asyncHandler(async (req, res) => {
  await quoteService.remove(req.params.id);
  res.status(204).end();
});

export const pdf = asyncHandler(async (req, res) => {
  const quote = await quoteService.getById(req.params.id);
  const doc = generarCotizacionPDF(quote);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="cotizacion-${quote.number}.pdf"`);
  doc.pipe(res);
  doc.end();
});
