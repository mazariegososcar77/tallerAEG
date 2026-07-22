import * as invoiceService from '../services/invoiceService.js';
import { generarFacturaPDF } from '../utils/pdfGenerator.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const list = asyncHandler(async (_req, res) => {
  res.json(await invoiceService.list());
});

export const getById = asyncHandler(async (req, res) => {
  res.json(await invoiceService.getById(req.params.id));
});

export const certify = asyncHandler(async (req, res) => {
  res.json(await invoiceService.certify(req.params.id, req.body.email));
});

export const pdf = asyncHandler(async (req, res) => {
  const invoice = await invoiceService.getById(req.params.id);
  const doc = generarFacturaPDF(invoice);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="factura-${invoice.number}.pdf"`);
  doc.pipe(res);
  doc.end();
});
