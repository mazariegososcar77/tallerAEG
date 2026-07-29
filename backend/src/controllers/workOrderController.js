// Este archivo recibe las peticiones web relacionadas a ÓRDENES DE TRABAJO: verlas,
// crearlas, editarlas, cambiar su estado, borrarlas y descargar el PDF.
import * as workOrderService from '../services/workOrderService.js';
import { generarOrdenTrabajoPDF } from '../utils/pdfGenerator.js';
import * as settingsService from '../services/settingsService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// Cuando el usuario abre la pantalla de Órdenes de Trabajo, esto trae la lista completa.
export const list = asyncHandler(async (_req, res) => {
  res.json(await workOrderService.list());
});

// Trae los datos completos de una orden de trabajo en particular.
export const getById = asyncHandler(async (req, res) => {
  res.json(await workOrderService.getById(req.params.id));
});

// Cuando el usuario guarda una orden de trabajo nueva desde el formulario, esto la recibe y la manda a guardar.
export const create = asyncHandler(async (req, res) => {
  res.status(201).json(await workOrderService.create(req.body));
});

// Cuando el usuario edita una orden de trabajo y guarda los cambios, esto los aplica.
export const update = asyncHandler(async (req, res) => {
  res.json(await workOrderService.update(req.params.id, req.body));
});

// Cuando el usuario cambia el estado de una orden (por ejemplo, de "recibido" a "en_proceso"), esto lo actualiza.
export const updateStatus = asyncHandler(async (req, res) => {
  res.json(await workOrderService.updateStatus(req.params.id, req.body.status));
});

// Cuando el usuario borra una orden de trabajo, esto la elimina.
export const remove = asyncHandler(async (req, res) => {
  await workOrderService.remove(req.params.id);
  res.status(204).end();
});

// Cuando el usuario descarga el PDF de una orden de trabajo, esto genera el archivo y se lo envía.
export const pdf = asyncHandler(async (req, res) => {
  const order = await workOrderService.getById(req.params.id);
  const doc = generarOrdenTrabajoPDF(order, await settingsService.getSettings());
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="orden-${order.number}.pdf"`);
  doc.pipe(res);
  doc.end();
});
