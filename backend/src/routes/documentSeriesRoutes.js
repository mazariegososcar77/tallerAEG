// Este archivo define las direcciones web (rutas) para la NUMERACION DE DOCUMENTOS:
// ver y editar el prefijo/digitos/siguiente numero de cada tipo de documento correlativo.
import { Router } from 'express';
import { z } from 'zod';
import * as documentSeriesController from '../controllers/documentSeriesController.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requirePermission } from '../middleware/rbac.middleware.js';
import { validate } from '../middleware/validate.middleware.js';

const router = Router();

// Editar una serie: los 3 campos son opcionales, pero debe venir al menos uno.
const updateSchema = z
  .object({
    prefix: z.string().max(20).optional(),
    digits: z.number().int().min(1).max(10).optional(),
    next_number: z.number().int().min(1).optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'No hay cambios para aplicar' });

router.use(authenticate);

/**
 * @openapi
 * /document-series:
 *   get:
 *     tags: [Numeracion de documentos]
 *     summary: Listar las series de numeracion (cotizacion, orden de trabajo, orden de servicio, factura, reporte)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Lista de series }
 */
router.get('/', requirePermission('document-series.view'), documentSeriesController.list);

/**
 * @openapi
 * /document-series/{documentType}:
 *   put:
 *     tags: [Numeracion de documentos]
 *     summary: Editar el prefijo, los digitos y/o el siguiente numero de una serie
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: documentType, required: true, schema: { type: string } }]
 *     responses:
 *       200: { description: Serie actualizada }
 */
router.put('/:documentType', requirePermission('document-series.update'), validate(updateSchema), documentSeriesController.update);

export default router;
