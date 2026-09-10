// Este archivo define las direcciones web (rutas) para manejar los TIPOS DE CLIENTE
// (el catalogo que clasifica a los clientes, ej. "Empresa", "Particular"): ver, crear, editar y borrar.
import { Router } from 'express';
import { z } from 'zod';
import * as clientTypeController from '../controllers/clientTypeController.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requirePermission } from '../middleware/rbac.middleware.js';
import { validate } from '../middleware/validate.middleware.js';

const router = Router();

// Para crear un tipo de cliente: el nombre es obligatorio (minimo 2 letras), la descripcion es opcional.
const createSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  description: z.string().max(255).optional(),
  is_active: z.boolean().optional(),
});

// Para editar un tipo de cliente: los mismos datos pero opcionales, y debe venir al menos un cambio.
const updateSchema = createSchema
  .partial()
  .refine((d) => Object.keys(d).length > 0, { message: 'No hay cambios para aplicar' });

// A partir de aqui, todas las rutas de este archivo exigen haber iniciado sesion.
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
// Ver la lista de tipos de cliente.
router.get('/', requirePermission('client-types.view'), clientTypeController.list);
// Crear un tipo de cliente nuevo.
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
// Editar un tipo de cliente existente.
router.put('/:id', requirePermission('client-types.update'), validate(updateSchema), clientTypeController.update);
// Borrar un tipo de cliente (no se puede si hay clientes usandolo).
router.delete('/:id', requirePermission('client-types.delete'), clientTypeController.remove);

export default router;
