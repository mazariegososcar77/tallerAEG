// Este archivo recibe las peticiones web relacionadas a FACTURACIÓN: ver facturas,
// certificarlas y descargar el PDF de una factura.
import * as invoiceService from '../services/invoiceService.js';
import * as documentFlowService from '../services/documentFlowService.js';
import { generarFacturaPDF } from '../utils/pdfGenerator.js';
import * as settingsService from '../services/settingsService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// Cuando el usuario abre la pantalla de Facturación, esto trae la lista de facturas.
export const list = asyncHandler(async (_req, res) => {
  res.json(await invoiceService.list());
});

// Trae los datos completos de una factura en particular.
export const getById = asyncHandler(async (req, res) => {
  res.json(await invoiceService.getById(req.params.id));
});

// Flujo Post: genera la factura de una orden de trabajo a mano (boton "Generar
// Factura"), una vez que su cotizacion (armada despues del reporte) ya esta
// aprobada. Ver invoiceService.createFromWorkOrder para las reglas exactas.
export const createFromWorkOrder = asyncHandler(async (req, res) => {
  res.status(201).json(await invoiceService.createFromWorkOrder(req.params.workOrderId));
});

// Cuando el usuario certifica una factura (captura el correo del cliente y confirma), esto la
// certifica ante la SAT vía Digifact (o solo administrativamente si faltan credenciales, ver
// felCertifier.js) y le manda el PDF oficial al correo.
export const certify = asyncHandler(async (req, res) => {
  res.json(await invoiceService.certify(req.params.id, req.body.email));
});

// Mapa de Relaciones: la cadena de documentos (Cotizacion -> Orden -> Reporte ->
// Factura) de la orden que generó esta factura.
export const documentFlow = asyncHandler(async (req, res) => {
  res.json(await documentFlowService.getForInvoice(req.params.id));
});

// Cuando el usuario descarga el PDF de una factura, esto genera el archivo y se lo envía.
export const pdf = asyncHandler(async (req, res) => {
  const invoice = await invoiceService.getById(req.params.id);
  const doc = generarFacturaPDF(invoice, await settingsService.getSettings());
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="factura-${invoice.number}.pdf"`);
  doc.pipe(res);
  doc.end();
});

// Descarga el PDF OFICIAL de la factura (el que emite Digifact, con el QR de la SAT). Distinto
// de /pdf, que es la representacion interna del taller.
export const felPdf = asyncHandler(async (req, res) => {
  const file = await invoiceService.getFelFile(req.params.id, 'pdf');
  res.setHeader('Content-Type', file.contentType);
  res.setHeader('Content-Disposition', `inline; filename="${file.filename}"`);
  res.send(file.data);
});

// Descarga el XML certificado (el documento legal, para conservarlo o dárselo al contador).
export const felXml = asyncHandler(async (req, res) => {
  const file = await invoiceService.getFelFile(req.params.id, 'xml');
  res.setHeader('Content-Type', file.contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
  res.send(file.data);
});

// Reenvía por correo el PDF oficial de una factura ya certificada.
export const sendEmail = asyncHandler(async (req, res) => {
  res.json(await invoiceService.sendEmail(req.params.id, req.body?.email));
});

// Anula una factura certificada (ante la SAT si se certifico de verdad). Exige el motivo.
export const cancel = asyncHandler(async (req, res) => {
  res.json(await invoiceService.cancel(req.params.id, req.body.reason));
});

// Consulta un NIT en la SAT y devuelve el nombre registrado (para avisar de un NIT mal escrito).
export const lookupNit = asyncHandler(async (req, res) => {
  res.json(await invoiceService.lookupNit(req.params.nit));
});

// Dice si Digifact esta configurado y en que ambiente (pruebas / real).
export const felStatus = asyncHandler(async (_req, res) => {
  res.json(invoiceService.felStatus());
});
