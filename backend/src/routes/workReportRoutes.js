// Este archivo define las direcciones web (rutas) para manejar los REPORTES DE TRABAJO
// (la documentacion fotografica de una orden, en 4 etapas fijas, con notas y firmas): ver, crear,
// editar, borrar, agregar/quitar fotos, guardar firmas, descargar el PDF y finalizar (lo que genera
// la factura automaticamente).
import { Router } from 'express';
import { z } from 'zod';
import * as workReportController from '../controllers/workReportController.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requirePermission } from '../middleware/rbac.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { uploadReportPhoto } from '../middleware/upload.middleware.js';

const router = Router();

// Para crear un reporte: exige el id de una orden de trabajo O de una orden de
// servicio (nunca ambas) -- un reporte documenta exactamente una de las dos.
const createSchema = z.object({
  work_order_id: z.coerce.number().int().positive('Orden de trabajo invalida').optional(),
  service_order_id: z.coerce.number().int().positive('Orden de servicio invalida').optional(),
}).refine((d) => Boolean(d.work_order_id) !== Boolean(d.service_order_id), {
  message: 'Debe venir exactamente uno: work_order_id o service_order_id',
});

// Para editar un reporte: notas generales y/o notas por etapa, todo opcional.
const updateSchema = z.object({
  general_notes: z.string().max(2000).optional().or(z.literal('')),
  stage_notes: z.record(z.string().max(2000)).optional(),
});

// A partir de aqui, todas las rutas de este archivo exigen haber iniciado sesion.
router.use(authenticate);

/**
 * @openapi
 * /work-reports:
 *   get:
 *     tags: [Reportes de Trabajo]
 *     summary: Listar reportes de trabajo
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Lista de reportes }
 *   post:
 *     tags: [Reportes de Trabajo]
 *     summary: Crear (o recuperar) el reporte de una orden de trabajo
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Reporte creado o existente }
 */
// Ver la lista de reportes de trabajo.
router.get('/', requirePermission('work-reports.view'), workReportController.list);
// Crear el reporte de una orden de trabajo o de servicio (si ya existe, lo devuelve).
router.post('/', requirePermission('work-reports.create'), validate(createSchema), workReportController.create);

/**
 * @openapi
 * /work-reports/{id}:
 *   get:
 *     tags: [Reportes de Trabajo]
 *     summary: Obtener un reporte de trabajo (con sus fotos)
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     responses:
 *       200: { description: Reporte }
 *       404: { description: No encontrado }
 *   put:
 *     tags: [Reportes de Trabajo]
 *     summary: Actualizar notas generales del reporte
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     responses:
 *       200: { description: Reporte actualizado }
 *   delete:
 *     tags: [Reportes de Trabajo]
 *     summary: Eliminar un reporte de trabajo
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     responses:
 *       204: { description: Eliminado }
 */
// Ver el detalle de un reporte especifico (con sus fotos).
router.get('/:id', requirePermission('work-reports.view'), workReportController.getById);
// Actualizar las notas generales/por etapa del reporte.
router.put('/:id', requirePermission('work-reports.update'), validate(updateSchema), workReportController.update);
// Borrar un reporte de trabajo.
router.delete('/:id', requirePermission('work-reports.delete'), workReportController.remove);

/**
 * @openapi
 * /work-reports/{id}/photos:
 *   post:
 *     tags: [Reportes de Trabajo]
 *     summary: Agregar una foto a una etapa del reporte (multipart, campo "photo")
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               photo: { type: string, format: binary }
 *               stage: { type: string, enum: [antes, desarmado, piezas_nuevas, armado_final] }
 *               caption: { type: string }
 *     responses:
 *       201: { description: Foto agregada }
 */
// Agregar una foto a una etapa del reporte.
router.post('/:id/photos', requirePermission('work-reports.update'), uploadReportPhoto, workReportController.addPhoto);

/**
 * @openapi
 * /work-reports/{id}/photos/{photoId}:
 *   delete:
 *     tags: [Reportes de Trabajo]
 *     summary: Eliminar una foto del reporte
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *       - { in: path, name: photoId, required: true, schema: { type: integer } }
 *     responses:
 *       204: { description: Eliminada }
 */
// Quitar una foto del reporte.
router.delete('/:id/photos/:photoId', requirePermission('work-reports.update'), workReportController.removePhoto);

/**
 * @openapi
 * /work-reports/{id}/signature:
 *   post:
 *     tags: [Reportes de Trabajo]
 *     summary: Guardar la firma (dibujada, subida como imagen) de quien entrega o quien recibe el trabajo
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               photo: { type: string, format: binary }
 *               role: { type: string, enum: [tech, client] }
 *               name: { type: string }
 *     responses:
 *       200: { description: Reporte con la firma guardada }
 */
// Guardar la firma (dibujada a mano y subida como imagen) del tecnico o del cliente.
router.post('/:id/signature', requirePermission('work-reports.update'), uploadReportPhoto, workReportController.setSignature);

/**
 * @openapi
 * /work-reports/{id}/pdf:
 *   get:
 *     tags: [Reportes de Trabajo]
 *     summary: Descargar el PDF del reporte de trabajo
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     responses:
 *       200: { description: PDF del reporte }
 */
// Descargar el PDF del reporte de trabajo.
router.get('/:id/pdf', requirePermission('work-reports.view'), workReportController.pdf);

/**
 * @openapi
 * /work-reports/{id}/finalize:
 *   post:
 *     tags: [Reportes de Trabajo]
 *     summary: Finalizar el reporte y generar la factura asociada
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     responses:
 *       200: { description: "{ report, invoice }" }
 */
// Finalizar el reporte (exige que las 4 etapas tengan foto y nota, y ambas firmas) y generar la factura.
router.post('/:id/finalize', requirePermission('work-reports.update'), workReportController.finalize);

/**
 * @openapi
 * /work-reports/{id}/signing-link:
 *   post:
 *     tags: [Reportes de Trabajo]
 *     summary: Generar (o recuperar) el enlace publico de firma remota del cliente
 *     description: Para cuando el equipo se entrega con mensajero y el cliente no esta en el taller -- ver rutas /public/work-reports.
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     responses:
 *       200: { description: "{ token }" }
 */
// Generar/recuperar el token del enlace publico de firma remota.
router.post('/:id/signing-link', requirePermission('work-reports.update'), workReportController.getSigningLink);

export default router;
