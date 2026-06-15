import { Router } from 'express';
import { z } from 'zod';
import * as clientTypeController from '../controllers/clientTypeController.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requirePermission } from '../middleware/rbac.middleware.js';
import { validate } from '../middleware/validate.middleware.js';

const router = Router();

const createSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  description: z.string().max(255).optional(),
  is_active: z.boolean().optional(),
});

const updateSchema = createSchema
  .partial()
  .refine((d) => Object.keys(d).length > 0, { message: 'No hay cambios para aplicar' });

router.use(authenticate);

/**
 * @openapi
 * /client-types:
 *   get:
 *     tags: [Tipos de cliente]
 *     summary: Listar tipos de cliente
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Lista de tipos de cliente }
 *   post:
 *     tags: [Tipos de cliente]
 *     summary: Crear tipo de cliente
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Tipo creado }
 */
router.get('/', requirePermission('client-types.view'), clientTypeController.list);
router.post('/', requirePermission('client-types.create'), validate(createSchema), clientTypeController.create);

/**
 * @openapi
 * /client-types/{id}:
 *   put:
 *     tags: [Tipos de cliente]
 *     summary: Actualizar tipo de cliente
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     responses:
 *       200: { description: Tipo actualizado }
 *   delete:
 *     tags: [Tipos de cliente]
 *     summary: Eliminar tipo de cliente
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     responses:
 *       204: { description: Eliminado }
 *       409: { description: Tipo con clientes asignados }
 */
router.put('/:id', requirePermission('client-types.update'), validate(updateSchema), clientTypeController.update);
router.delete('/:id', requirePermission('client-types.delete'), clientTypeController.remove);

export default router;
