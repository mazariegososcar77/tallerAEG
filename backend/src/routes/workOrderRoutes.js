// Este archivo define las direcciones web (rutas) para manejar las ORDENES DE TRABAJO
// (la ficha del equipo que entra al taller): ver la lista, ver el detalle, crear, editar,
// cambiar su estado, borrar y descargar el PDF.
import { Router } from 'express';
import * as workOrderController from '../controllers/workOrderController.js';
import * as workOrderDocumentController from '../controllers/workOrderDocumentController.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requirePermission } from '../middleware/rbac.middleware.js';
import { uploadDocument, soloSiEsMultipart } from '../middleware/upload.middleware.js';

const router = Router();
// A partir de aqui, todas las rutas de este archivo exigen haber iniciado sesion.
router.use(authenticate);

// Ver la lista de ordenes de trabajo. (Nota: hoy solo exige el permiso general de "ver dashboard", no un permiso especifico de ordenes)
router.get('/',              requirePermission('dashboard.view'), workOrderController.list);
// Ver el detalle de una orden especifica.
router.get('/:id',           requirePermission('dashboard.view'), workOrderController.getById);
// Crear una orden de trabajo nueva.
router.post('/',             requirePermission('dashboard.view'), workOrderController.create);
// Editar una orden de trabajo existente.
router.put('/:id',           requirePermission('dashboard.view'), workOrderController.update);
// Cambiar solo el estado de una orden (recibido, en proceso, listo, entregado, cancelado).
router.patch('/:id/status',  requirePermission('dashboard.view'), workOrderController.updateStatus);
// Borrar una orden de trabajo.
router.delete('/:id',        requirePermission('dashboard.view'), workOrderController.remove);
// Descargar el PDF de la orden de trabajo.
router.get('/:id/pdf',       requirePermission('dashboard.view'), workOrderController.pdf);
// Mapa de Relaciones: cadena de documentos (Cotizacion -> Orden -> Reporte -> Factura).
router.get('/:id/document-flow', requirePermission('dashboard.view'), workOrderController.documentFlow);

// --- Documentos adjuntos de la orden (papeleria de terceros) ---
// Estas rutas SI tienen permisos granulares propios, a diferencia del resto del
// archivo: adjuntar papeleria de un tercero y, sobre todo, borrarla, son cosas muy
// distintas de "ver el dashboard". Borrar queda solo para Administrador.

/**
 * @openapi
 * /work-orders/{id}/documents:
 *   get:
 *     tags: [Ordenes de Trabajo]
 *     summary: Listar los documentos adjuntos de una orden
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     responses:
 *       200: { description: Lista de documentos }
 *   post:
 *     tags: [Ordenes de Trabajo]
 *     summary: Adjuntar un documento (multipart, campo "document" mas "title")
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               document: { type: string, format: binary }
 *               title: { type: string }
 *     responses:
 *       201: { description: Documento adjuntado }
 */
router.get('/:id/documents',  requirePermission('work-order-documents.view'),   workOrderDocumentController.list);
router.post('/:id/documents', requirePermission('work-order-documents.manage'), soloSiEsMultipart(uploadDocument), workOrderDocumentController.add);

/**
 * @openapi
 * /work-orders/{id}/documents/review:
 *   post:
 *     tags: [Ordenes de Trabajo]
 *     summary: Confirmar que ya se revisaron los documentos de la orden
 *     description: >
 *       Paso obligatorio antes de facturar. Confirmar que NO hay documentos
 *       adicionales tambien vale: lo que queda registrado es que alguien se hizo la
 *       pregunta, con su nombre y la fecha.
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     responses:
 *       200: { description: Orden con la revision registrada }
 */
router.post('/:id/documents/review', requirePermission('work-order-documents.manage'), workOrderDocumentController.review);

/**
 * @openapi
 * /work-orders/{id}/documents/{documentId}:
 *   delete:
 *     tags: [Ordenes de Trabajo]
 *     summary: Eliminar un documento adjunto (solo Administrador)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *       - { in: path, name: documentId, required: true, schema: { type: integer } }
 *     responses:
 *       204: { description: Documento eliminado }
 */
router.delete('/:id/documents/:documentId', requirePermission('work-order-documents.delete'), workOrderDocumentController.remove);

export default router;
