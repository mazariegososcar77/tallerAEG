// Este archivo recibe las peticiones web relacionadas a COTIZACIONES: verlas, crearlas,
// editarlas, cambiar su estado, borrarlas y descargar el PDF.
import * as quoteService from '../services/quoteService.js';
import * as documentFlowService from '../services/documentFlowService.js';
import { generarCotizacionPDF, pdfABuffer } from '../utils/pdfGenerator.js';
import * as notificationService from '../services/notificationService.js';
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

// Mapa de Relaciones: la cadena de documentos (Cotizacion -> Orden(es) de
// Trabajo -> Reporte -> Factura) que nacieron de esta cotizacion.
export const documentFlow = asyncHandler(async (req, res) => {
  res.json(await documentFlowService.getForQuote(req.params.id));
});

// Manda la cotizacion al cliente por correo, con el PDF adjunto. El correo lo
// pide la pantalla al usuario (viene prellenado con el del cliente, pero se
// puede cambiar: muchas veces la cotizacion la recibe alguien de compras y no
// el contacto que quedo registrado en la ficha).
//
// El envio en si lo hace n8n; aqui solo se arma el PDF y se le pasa. A
// diferencia de los avisos automaticos, este SI espera la respuesta y reporta
// el error: el usuario apreto un boton y necesita saber si salio o no.
export const sendEmail = asyncHandler(async (req, res) => {
  const quote = await quoteService.getById(req.params.id);
  const doc = generarCotizacionPDF(quote, await settingsService.getSettings());
  const buffer = await pdfABuffer(doc);
  const resultado = await notificationService.sendQuoteEmail({
    quote,
    email: req.body.email,
    mensaje: req.body.message,
    pdfBase64: buffer.toString('base64'),
  });

  // Mandarsela al cliente ES enviarla: si seguia en borrador, pasa a "enviada".
  // No es solo la etiqueta -- el aviso de "cotizaciones por vencer" solo mira
  // las que estan en 'enviada', asi que sin esto una cotizacion mandada por
  // correo nunca generaria seguimiento. Los demas estados (aprobada,
  // rechazada, vencida) no se tocan: reenviar el PDF no los deshace.
  let status = quote.status;
  if (status === 'borrador') {
    await quoteService.updateStatus(quote.id, 'enviada');
    status = 'enviada';
  }

  res.json({ ...resultado, status });
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
