// Este archivo recibe las peticiones web relacionadas a ÓRDENES DE SERVICIO (trabajos
// subcontratados fuera del taller): verlas, crearlas, editarlas, cambiar su estado,
// borrarlas y descargar el PDF.
import * as serviceOrderService from '../services/serviceOrderService.js';
import { generarOrdenServicioPDF } from '../utils/pdfGenerator.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// Cuando el usuario abre la pantalla de Órdenes de Servicio, esto trae la lista completa.
export const list = asyncHandler(async (_req, res) => {
  res.json(await serviceOrderService.list());
});

// Trae los datos completos de una orden de servicio en particular.
export const getById = asyncHandler(async (req, res) => {
  res.json(await serviceOrderService.getById(req.params.id));
});

// Cuando el usuario guarda una orden de servicio nueva desde el formulario, esto la recibe y la manda a guardar.
export const create = asyncHandler(async (req, res) => {
  res.status(201).json(await serviceOrderService.create(req.body));
});

// Cuando el usuario edita una orden de servicio y guarda los cambios, esto los aplica.
export const update = asyncHandler(async (req, res) => {
  res.json(await serviceOrderService.update(req.params.id, req.body));
});

// Cuando el usuario cambia el estado de una orden de servicio, esto lo actualiza.
export const updateStatus = asyncHandler(async (req, res) => {
  res.json(await serviceOrderService.updateStatus(req.params.id, req.body.status));
});

// Cuando el usuario borra una orden de servicio, esto la elimina.
export const remove = asyncHandler(async (req, res) => {
  await serviceOrderService.remove(req.params.id);
  res.status(204).end();
});

// Cuando el usuario descarga el PDF de una orden de servicio, esto genera el archivo y se lo envía.
export const pdf = asyncHandler(async (req, res) => {
  const order = await serviceOrderService.getById(req.params.id);
  const doc = generarOrdenServicioPDF(order);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="orden-servicio-${order.number}.pdf"`);
  doc.pipe(res);
  doc.end();
});
