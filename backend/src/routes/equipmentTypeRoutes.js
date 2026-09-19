// Este archivo define las direcciones web (rutas) para manejar los TIPOS DE EQUIPO (el
// catalogo, con categoria, de las casillas "Tipo de equipo" de las ordenes): ver, crear,
// editar y borrar.
import { Router } from 'express';
import { z } from 'zod';
import * as equipmentTypeController from '../controllers/equipmentTypeController.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requirePermission } from '../middleware/rbac.middleware.js';
import { validate } from '../middleware/validate.middleware.js';

const router = Router();

// Para crear un tipo: nombre obligatorio; la categoria agrupa las casillas (por defecto "Otros").
const createSchema = z.object({
  name: z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres').max(150),
  category: z.string().trim().min(1, 'La categoria es obligatoria').max(100).optional(),
  is_active: z.preprocess((v) => (v === 1 || v === 0 ? Boolean(v) : v), z.boolean()).optional(),
});

// Para editar: los mismos datos pero opcionales, con al menos un cambio.
const updateSchema = createSchema
  .partial()
  .refine((d) => Object.keys(d).length > 0, { message: 'No hay cambios para aplicar' });

// A partir de aqui, todas las rutas de este archivo exigen haber iniciado sesion.
router.use(authenticate);

/**
 * @openapi
 * /equipment-types:
 *   get:
 *     tags: [Tipos de equipo]
 *     summary: Listar tipos de equipo (con su categoria)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Lista de tipos de equipo }
 *   post:
 *     tags: [Tipos de equipo]
 *     summary: Crear tipo de equipo
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Tipo creado }
 */
router.get('/', requirePermission('equipment-types.view'), equipmentTypeController.list);
router.post('/', requirePermission('equipment-types.create'), validate(createSchema), equipmentTypeController.create);

/**
 * @openapi
 * /equipment-types/{id}:
 *   put:
 *     tags: [Tipos de equipo]
 *     summary: Actualizar tipo de equipo
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     responses:
 *       200: { description: Tipo actualizado }
 *   delete:
 *     tags: [Tipos de equipo]
 *     summary: Eliminar tipo de equipo
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     responses:
 *       204: { description: Eliminado }
 */
router.put('/:id', requirePermission('equipment-types.update'), validate(updateSchema), equipmentTypeController.update);
router.delete('/:id', requirePermission('equipment-types.delete'), equipmentTypeController.remove);

export default router;
