// Este archivo define las direcciones web (rutas) para manejar los TIPOS DE TRABAJO
// (el catalogo que alimenta el selector "Tipo de trabajo" de Cotizaciones y Ordenes de
// Trabajo): ver, crear, editar y borrar.
import { Router } from 'express';
import { z } from 'zod';
import { booleanFlag } from '../utils/zodHelpers.js';
import * as workTypeController from '../controllers/workTypeController.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requirePermission } from '../middleware/rbac.middleware.js';
import { validate } from '../middleware/validate.middleware.js';

const router = Router();

// Para crear un tipo de trabajo: el nombre es obligatorio (minimo 2 letras), la descripcion es opcional.
const createSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  description: z.string().max(255).optional(),
  is_active: booleanFlag.optional(),
});

// Para editar un tipo de trabajo: los mismos datos pero opcionales, y debe venir al menos un cambio.
const updateSchema = z
  .object({
    name: z.string().min(2).optional(),
    description: z.string().max(255).optional(),
    is_active: booleanFlag.optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'No hay cambios para aplicar' });

// A partir de aqui, todas las rutas de este archivo exigen haber iniciado sesion.
router.use(authenticate);

/**
 * @openapi
 * /work-types:
 *   get:
 *     tags: [Tipos de trabajo]
 *     summary: Listar tipos de trabajo
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Lista de tipos de trabajo }
 *   post:
 *     tags: [Tipos de trabajo]
 *     summary: Crear tipo de trabajo
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Tipo creado }
 */
// Ver la lista de tipos de trabajo.
router.get('/', requirePermission('work-types.view'), workTypeController.list);
// Crear un tipo de trabajo nuevo.
router.post('/', requirePermission('work-types.create'), validate(createSchema), workTypeController.create);

/**
 * @openapi
 * /work-types/{id}:
 *   put:
 *     tags: [Tipos de trabajo]
 *     summary: Actualizar tipo de trabajo
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     responses:
 *       200: { description: Tipo actualizado }
 *   delete:
 *     tags: [Tipos de trabajo]
 *     summary: Eliminar tipo de trabajo
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     responses:
 *       204: { description: Eliminado }
 */
// Editar un tipo de trabajo existente.
router.put('/:id', requirePermission('work-types.update'), validate(updateSchema), workTypeController.update);
// Borrar un tipo de trabajo.
router.delete('/:id', requirePermission('work-types.delete'), workTypeController.remove);

export default router;
