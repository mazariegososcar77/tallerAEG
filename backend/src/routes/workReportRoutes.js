import { Router } from 'express';
import { z } from 'zod';
import * as workReportController from '../controllers/workReportController.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requirePermission } from '../middleware/rbac.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { uploadReportPhoto } from '../middleware/upload.middleware.js';

const router = Router();

const createSchema = z.object({
  work_order_id: z.coerce.number().int().positive('Orden de trabajo invalida'),
});

const updateSchema = z.object({
  general_notes: z.string().max(2000).optional().or(z.literal('')),
  stage_notes: z.record(z.string().max(2000)).optional(),
});

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
router.get('/', requirePermission('work-reports.view'), workReportController.list);
router.post('/', requirePermission('work-reports.create'), validate(createSchema), workReportController.createForOrder);

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
router.get('/:id', requirePermission('work-reports.view'), workReportController.getById);
router.put('/:id', requirePermission('work-reports.update'), validate(updateSchema), workReportController.update);
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
router.post('/:id/finalize', requirePermission('work-reports.update'), workReportController.finalize);

export default router;
