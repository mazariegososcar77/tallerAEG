import { Router } from 'express';
import { z } from 'zod';
import * as userController from '../controllers/userController.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requirePermission } from '../middleware/rbac.middleware.js';
import { validate } from '../middleware/validate.middleware.js';

const router = Router();

const createSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  email: z.string().email('Correo invalido'),
  password: z.string().min(6, 'La contrasena debe tener al menos 6 caracteres'),
  role_id: z.coerce.number().int().positive('Rol invalido'),
  is_active: z.boolean().optional(),
});

const updateSchema = z
  .object({
    name: z.string().min(2).optional(),
    email: z.string().email('Correo invalido').optional(),
    password: z.string().min(6, 'La contrasena debe tener al menos 6 caracteres').optional(),
    role_id: z.coerce.number().int().positive().optional(),
    is_active: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: 'No hay cambios para aplicar' });

// Todas las rutas de usuarios requieren autenticacion.
router.use(authenticate);

/**
 * @openapi
 * /users:
 *   get:
 *     tags: [Usuarios]
 *     summary: Listar usuarios
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Lista de usuarios
 *         content:
 *           application/json:
 *             schema: { type: array, items: { $ref: '#/components/schemas/User' } }
 *   post:
 *     tags: [Usuarios]
 *     summary: Crear usuario
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/UserCreate' }
 *     responses:
 *       201: { description: Usuario creado }
 *       409: { description: Correo ya registrado }
 */
router.get('/', requirePermission('users.view'), userController.list);
router.post('/', requirePermission('users.create'), validate(createSchema), userController.create);

/**
 * @openapi
 * /users/{id}:
 *   get:
 *     tags: [Usuarios]
 *     summary: Obtener un usuario
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Usuario }
 *       404: { description: No encontrado }
 *   put:
 *     tags: [Usuarios]
 *     summary: Actualizar usuario
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/UserUpdate' }
 *     responses:
 *       200: { description: Usuario actualizado }
 *   delete:
 *     tags: [Usuarios]
 *     summary: Eliminar usuario
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       204: { description: Eliminado }
 */
router.get('/:id', requirePermission('users.view'), userController.getById);
router.put('/:id', requirePermission('users.update'), validate(updateSchema), userController.update);
router.delete('/:id', requirePermission('users.delete'), userController.remove);

export default router;
