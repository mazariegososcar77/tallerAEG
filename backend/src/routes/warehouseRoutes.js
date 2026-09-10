// Este archivo define las direcciones web (rutas) para manejar las BODEGAS del inventario:
// ver, crear, editar y borrar.
import { Router } from 'express';
import { z } from 'zod';
import * as warehouseController from '../controllers/warehouseController.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requirePermission } from '../middleware/rbac.middleware.js';
import { validate } from '../middleware/validate.middleware.js';

const router = Router();

// Un color valido en formato #RRGGBB (ej. #16285C).
const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Color invalido (formato #RRGGBB)');

// Para crear una bodega: el nombre es obligatorio (minimo 2 letras); descripcion y color son opcionales.
const createSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  description: z.string().max(255).optional(),
  color: hexColor.optional(),
  is_active: z.boolean().optional(),
});

// Para editar una bodega: los mismos datos pero opcionales, y debe venir al menos un cambio.
const updateSchema = z
  .object({
    name: z.string().min(2).optional(),
    description: z.string().max(255).optional(),
    color: hexColor.optional(),
    is_active: z.boolean().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'No hay cambios para aplicar' });

// A partir de aqui, todas las rutas de este archivo exigen haber iniciado sesion.
router.use(authenticate);

/**
 * @openapi
 * /warehouses:
 *   get:
 *     tags: [Bodegas]
 *     summary: Listar bodegas
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Lista de bodegas }
 *   post:
 *     tags: [Bodegas]
 *     summary: Crear bodega
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Bodega creada }
 */
// Ver la lista de bodegas.
router.get('/', requirePermission('warehouses.view'), warehouseController.list);
// Crear una bodega nueva.
router.post('/', requirePermission('warehouses.create'), validate(createSchema), warehouseController.create);

/**
 * @openapi
 * /warehouses/{id}:
 *   put:
 *     tags: [Bodegas]
 *     summary: Actualizar bodega
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     responses:
 *       200: { description: Bodega actualizada }
 *   delete:
 *     tags: [Bodegas]
 *     summary: Eliminar bodega
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     responses:
 *       204: { description: Eliminada }
 *       409: { description: Bodega con articulos asignados }
 */
// Editar una bodega existente.
router.put('/:id', requirePermission('warehouses.update'), validate(updateSchema), warehouseController.update);
// Borrar una bodega (no se puede si hay articulos en ella).
router.delete('/:id', requirePermission('warehouses.delete'), warehouseController.remove);

export default router;
