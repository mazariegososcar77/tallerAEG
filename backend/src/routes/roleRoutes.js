import { Router } from 'express';
import { z } from 'zod';
import * as roleController from '../controllers/roleController.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requirePermission } from '../middleware/rbac.middleware.js';
import { validate } from '../middleware/validate.middleware.js';

const router = Router();

const permissionIds = z.array(z.coerce.number().int().positive());

const createSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  description: z.string().max(255).optional(),
  permissions: permissionIds.optional(),
});

const updateSchema = z
  .object({
    name: z.string().min(2).optional(),
    description: z.string().max(255).optional(),
    is_active: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: 'No hay cambios para aplicar' });

const permissionsSchema = z.object({ permissions: permissionIds });

router.use(authenticate);

/**
 * @openapi
 * /roles:
 *   get:
 *     tags: [Roles]
 *     summary: Listar roles (con ids de permisos)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Lista de roles
 *         content:
 *           application/json:
 *             schema: { type: array, items: { $ref: '#/components/schemas/Role' } }
 *   post:
 *     tags: [Roles]
 *     summary: Crear rol
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/RoleCreate' }
 *     responses:
 *       201: { description: Rol creado }
 *       409: { description: Nombre de rol duplicado }
 */
router.get('/', requirePermission('roles.view'), roleController.list);
router.post('/', requirePermission('roles.create'), validate(createSchema), roleController.create);

/**
 * @openapi
 * /roles/{id}:
 *   get:
 *     tags: [Roles]
 *     summary: Obtener un rol
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     responses:
 *       200: { description: Rol }
 *       404: { description: No encontrado }
 *   put:
 *     tags: [Roles]
 *     summary: Actualizar rol
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/RoleUpdate' }
 *     responses:
 *       200: { description: Rol actualizado }
 *   delete:
 *     tags: [Roles]
 *     summary: Eliminar rol
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     responses:
 *       204: { description: Eliminado }
 *       409: { description: El rol tiene usuarios asignados }
 */
router.get('/:id', requirePermission('roles.view'), roleController.getById);
router.put('/:id', requirePermission('roles.update'), validate(updateSchema), roleController.update);
router.delete('/:id', requirePermission('roles.delete'), roleController.remove);

/**
 * @openapi
 * /roles/{id}/permissions:
 *   put:
 *     tags: [Roles]
 *     summary: Reemplazar los permisos de un rol
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [permissions]
 *             properties:
 *               permissions: { type: array, items: { type: integer }, example: [1, 2, 6] }
 *     responses:
 *       200: { description: Rol con permisos actualizados }
 */
router.put(
  '/:id/permissions',
  requirePermission('roles.update'),
  validate(permissionsSchema),
  roleController.setPermissions,
);

export default router;
