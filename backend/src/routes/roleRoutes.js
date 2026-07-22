// Este archivo define las direcciones web (rutas) para manejar los ROLES (perfiles de permisos
// que se le asignan a los usuarios): ver, crear, editar, borrar y cambiar sus permisos.
import { Router } from 'express';
import { z } from 'zod';
import * as roleController from '../controllers/roleController.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requirePermission } from '../middleware/rbac.middleware.js';
import { validate } from '../middleware/validate.middleware.js';

const router = Router();

// Una lista de ids de permisos (numeros positivos).
const permissionIds = z.array(z.coerce.number().int().positive());

// Para crear un rol: el nombre es obligatorio (minimo 2 letras); se le puede asignar una lista de permisos de una vez.
const createSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  description: z.string().max(255).optional(),
  permissions: permissionIds.optional(),
});

// Para editar un rol: los mismos datos basicos pero opcionales, y debe venir al menos un cambio.
const updateSchema = z
  .object({
    name: z.string().min(2).optional(),
    description: z.string().max(255).optional(),
    is_active: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: 'No hay cambios para aplicar' });

// Para reemplazar los permisos de un rol: exige la lista completa de ids de permisos.
const permissionsSchema = z.object({ permissions: permissionIds });

// A partir de aqui, todas las rutas de este archivo exigen haber iniciado sesion.
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
// Ver la lista de roles.
router.get('/', requirePermission('roles.view'), roleController.list);
// Crear un rol nuevo.
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
// Ver el detalle de un rol especifico.
router.get('/:id', requirePermission('roles.view'), roleController.getById);
// Editar un rol existente.
router.put('/:id', requirePermission('roles.update'), validate(updateSchema), roleController.update);
// Borrar un rol (no se puede si hay usuarios usandolo).
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
// Reemplazar la lista completa de permisos de un rol.
router.put(
  '/:id/permissions',
  requirePermission('roles.update'),
  validate(permissionsSchema),
  roleController.setPermissions,
);

export default router;
