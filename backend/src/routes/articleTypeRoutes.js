import { Router } from 'express';
import { z } from 'zod';
import * as articleTypeController from '../controllers/articleTypeController.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requirePermission } from '../middleware/rbac.middleware.js';
import { validate } from '../middleware/validate.middleware.js';

const router = Router();

const createSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  description: z.string().max(255).optional(),
  is_active: z.boolean().optional(),
});

const updateSchema = z
  .object({
    name: z.string().min(2).optional(),
    description: z.string().max(255).optional(),
    is_active: z.boolean().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'No hay cambios para aplicar' });

router.use(authenticate);

/**
 * @openapi
 * /article-types:
 *   get:
 *     tags: [Tipos de articulo]
 *     summary: Listar tipos de articulo
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Lista de tipos }
 *   post:
 *     tags: [Tipos de articulo]
 *     summary: Crear tipo de articulo
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Tipo creado }
 */
router.get('/', requirePermission('article-types.view'), articleTypeController.list);
router.post('/', requirePermission('article-types.create'), validate(createSchema), articleTypeController.create);

/**
 * @openapi
 * /article-types/{id}:
 *   put:
 *     tags: [Tipos de articulo]
 *     summary: Actualizar tipo
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     responses:
 *       200: { description: Tipo actualizado }
 *   delete:
 *     tags: [Tipos de articulo]
 *     summary: Eliminar tipo
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     responses:
 *       204: { description: Eliminado }
 *       409: { description: Tipo con articulos asignados }
 */
router.put('/:id', requirePermission('article-types.update'), validate(updateSchema), articleTypeController.update);
router.delete('/:id', requirePermission('article-types.delete'), articleTypeController.remove);

export default router;
