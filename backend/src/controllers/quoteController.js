// Este archivo recibe las peticiones web relacionadas a COTIZACIONES: verlas, crearlas,
// editarlas, cambiar su estado, borrarlas y descargar el PDF.
import * as quoteService from '../services/quoteService.js';
import { generarCotizacionPDF } from '../utils/pdfGenerator.js';
import * as settingsService from '../services/settingsService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// Cuando el usuario abre la pantalla de Cotizaciones, esto trae la lista completa.
export const list = asyncHandler(async (_req, res) => {
  res.json(await quoteService.list());
});

// Trae los datos completos de una cotización en particular.
export const getById = asyncHandler(async (req, res) => {
  res.json(await quoteService.getById(req.params.id));
});

// Cuando el usuario guarda una cotización nueva desde el formulario, esto la recibe y la manda a guardar.
export const create = asyncHandler(async (req, res) => {
  res.status(201).json(await quoteService.create(req.body));
});

// Cuando el usuario edita una cotización y guarda los cambios, esto los aplica.
export const update = asyncHandler(async (req, res) => {
  res.json(await quoteService.update(req.params.id, req.body));
});

// Cuando el usuario cambia el estado de una cotización (por ejemplo, de "pendiente" a "aprobada"), esto lo actualiza.
export const updateStatus = asyncHandler(async (req, res) => {
  res.json(await quoteService.updateStatus(req.params.id, req.body.status));
});

// Cuando el usuario borra una cotización, esto la elimina.
export const remove = asyncHandler(async (req, res) => {
  await quoteService.remove(req.params.id);
  res.status(204).end();
});

// Cuando el usuario descarga el PDF de una cotización, esto genera el archivo y se lo envía.
export const pdf = asyncHandler(async (req, res) => {
  const quote = await quoteService.getById(req.params.id);
  const doc = generarCotizacionPDF(quote, await settingsService.getSettings());
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="cotizacion-${quote.number}.pdf"`);
  doc.pipe(res);
  doc.end();
});
