import { Router } from 'express';
import { z } from 'zod';
import * as clientController from '../controllers/clientController.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requirePermission } from '../middleware/rbac.middleware.js';
import { validate } from '../middleware/validate.middleware.js';

const router = Router();

// FK opcional: numero positivo o null (el cliente puede no tener tipo/nivel asignado).
const optionalRef = z.union([z.coerce.number().int().positive(), z.null()]).optional();

const baseShape = {
  nit: z.string().trim().max(20).optional(),
  dpi: z.string().trim().max(20).optional(),
  first_name: z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres'),
  last_name: z.string().trim().min(2, 'El apellido debe tener al menos 2 caracteres'),
  email: z.string().trim().max(190).email('Correo invalido').optional().or(z.literal('')),
  address: z.string().max(255).optional(),
  phone: z.string().trim().min(5, 'El telefono es obligatorio'),
  client_type_id: optionalRef,
  loyalty_tier_id: optionalRef,
  is_active: z.boolean().optional(),
};

// Regla: solo uno de NIT/DPI puede quedar vacio (al menos uno es obligatorio).
const atLeastOneId = (d) => Boolean((d.nit && d.nit.trim()) || (d.dpi && d.dpi.trim()));

const createSchema = z
  .object(baseShape)
  .refine(atLeastOneId, { message: 'Debe indicar al menos el NIT o el DPI', path: ['nit'] });

const updateSchema = z
  .object(baseShape)
  .partial()
  .refine((d) => Object.keys(d).length > 0, { message: 'No hay cambios para aplicar' });

router.use(authenticate);

/**
 * @openapi
 * /clients:
 *   get:
 *     tags: [Clientes]
 *     summary: Listar clientes (con tipo y nivel de fidelizacion resueltos)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Lista de clientes }
 *   post:
 *     tags: [Clientes]
 *     summary: Crear cliente
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Cliente creado }
 *       409: { description: NIT o DPI duplicado }
 */
router.get('/', requirePermission('clients.view'), clientController.list);
router.post('/', requirePermission('clients.create'), validate(createSchema), clientController.create);

/**
 * @openapi
 * /clients/{id}:
 *   get:
 *     tags: [Clientes]
 *     summary: Obtener un cliente
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     responses:
 *       200: { description: Cliente }
 *       404: { description: No encontrado }
 *   put:
 *     tags: [Clientes]
 *     summary: Actualizar cliente
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     responses:
 *       200: { description: Cliente actualizado }
 *   delete:
 *     tags: [Clientes]
 *     summary: Eliminar cliente
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     responses:
 *       204: { description: Eliminado }
 */
router.get('/:id', requirePermission('clients.view'), clientController.getById);
router.put('/:id', requirePermission('clients.update'), validate(updateSchema), clientController.update);
router.delete('/:id', requirePermission('clients.delete'), clientController.remove);

export default router;
