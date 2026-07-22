// Este archivo recibe las peticiones web relacionadas a FACTURACIÓN: ver facturas,
// certificarlas y descargar el PDF de una factura.
import * as invoiceService from '../services/invoiceService.js';
import { generarFacturaPDF } from '../utils/pdfGenerator.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// Cuando el usuario abre la pantalla de Facturación, esto trae la lista de facturas.
export const list = asyncHandler(async (_req, res) => {
  res.json(await invoiceService.list());
});

// Trae los datos completos de una factura en particular.
export const getById = asyncHandler(async (req, res) => {
  res.json(await invoiceService.getById(req.params.id));
});

// Cuando el usuario certifica una factura (captura el correo del cliente y confirma),
// esto marca la factura como certificada. Nota: la certificación fiscal (FEL) real todavía
// no está integrada, ver felCertifier.js.
export const certify = asyncHandler(async (req, res) => {
  res.json(await invoiceService.certify(req.params.id, req.body.email));
});

// Cuando el usuario descarga el PDF de una factura, esto genera el archivo y se lo envía.
export const pdf = asyncHandler(async (req, res) => {
  const invoice = await invoiceService.getById(req.params.id);
  const doc = generarFacturaPDF(invoice);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="factura-${invoice.number}.pdf"`);
  doc.pipe(res);
  doc.end();
});
