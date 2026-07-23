// Este archivo define las direcciones web (rutas) para manejar los SUBCONTRATISTAS:
// ver, crear, editar y borrar.
import { Router } from 'express';
import { z } from 'zod';
import * as subcontractorController from '../controllers/subcontractorController.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requirePermission } from '../middleware/rbac.middleware.js';
import { validate } from '../middleware/validate.middleware.js';

const router = Router();

// Para crear un subcontratista: el nombre es obligatorio; el resto es opcional.
const createSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  contact_name: z.string().max(150).optional(),
  phone: z.string().max(30).optional(),
  email: z.string().email('Correo invalido').max(150).optional().or(z.literal('')),
  is_active: z.boolean().optional(),
});

// Para editar un subcontratista: los mismos datos pero opcionales, y debe venir al menos un cambio.
const updateSchema = z
  .object({
    name: z.string().min(2).optional(),
    contact_name: z.string().max(150).optional(),
    phone: z.string().max(30).optional(),
    email: z.string().email('Correo invalido').max(150).optional().or(z.literal('')),
    is_active: z.boolean().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'No hay cambios para aplicar' });

// A partir de aqui, todas las rutas de este archivo exigen haber iniciado sesion.
router.use(authenticate);

/**
 * @openapi
 * /subcontractors:
 *   get:
 *     tags: [Subcontratistas]
 *     summary: Listar subcontratistas
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Lista de subcontratistas }
 *   post:
 *     tags: [Subcontratistas]
 *     summary: Crear subcontratista
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Subcontratista creado }
 */
router.get('/', requirePermission('subcontractors.view'), subcontractorController.list);
router.post('/', requirePermission('subcontractors.create'), validate(createSchema), subcontractorController.create);

/**
 * @openapi
 * /subcontractors/{id}:
 *   put:
 *     tags: [Subcontratistas]
 *     summary: Actualizar subcontratista
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     responses:
 *       200: { description: Subcontratista actualizado }
 *   delete:
 *     tags: [Subcontratistas]
 *     summary: Eliminar subcontratista
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     responses:
 *       204: { description: Eliminado }
 *       409: { description: Subcontratista con ordenes de servicio asignadas }
 */
router.put('/:id', requirePermission('subcontractors.update'), validate(updateSchema), subcontractorController.update);
router.delete('/:id', requirePermission('subcontractors.delete'), subcontractorController.remove);

export default router;
