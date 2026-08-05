// Este archivo define las direcciones web (rutas) para manejar los TIPOS DE ARTICULO
// (el catalogo que clasifica los articulos del inventario, ej. "Motores", "Repuestos"): ver, crear, editar y borrar.
import { Router } from 'express';
import { z } from 'zod';
import * as articleTypeController from '../controllers/articleTypeController.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requirePermission } from '../middleware/rbac.middleware.js';
import { validate } from '../middleware/validate.middleware.js';

const router = Router();

// Para crear un tipo de articulo: el nombre es obligatorio (minimo 2 letras), la descripcion es opcional.
const createSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  description: z.string().max(255).optional(),
  is_active: z.boolean().optional(),
});

// Para editar un tipo de articulo: los mismos datos pero opcionales, y debe venir al menos un cambio.
const updateSchema = z
  .object({
    name: z.string().min(2).optional(),
    description: z.string().max(255).optional(),
    is_active: z.boolean().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'No hay cambios para aplicar' });

// A partir de aqui, todas las rutas de este archivo exigen haber iniciado sesion.
router.use(authenticate);

/**
 * @openapi
 * /article-types:
 *   get:
 *     tags: [Tipos de articulo]
 *     summary: Listar tipos de articulo
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Lista de tipos }
 *   post:
 *     tags: [Tipos de articulo]
 *     summary: Crear tipo de articulo
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Tipo creado }
 */
// Ver la lista de tipos de articulo.
router.get('/', requirePermission('article-types.view'), articleTypeController.list);
// Crear un tipo de articulo nuevo.
router.post('/', requirePermission('article-types.create'), validate(createSchema), articleTypeController.create);

/**
 * @openapi
 * /article-types/{id}:
 *   put:
 *     tags: [Tipos de articulo]
 *     summary: Actualizar tipo
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     responses:
 *       200: { description: Tipo actualizado }
 *   delete:
 *     tags: [Tipos de articulo]
 *     summary: Eliminar tipo
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     responses:
 *       204: { description: Eliminado }
 *       409: { description: Tipo con articulos asignados }
 */
// Editar un tipo de articulo existente.
router.put('/:id', requirePermission('article-types.update'), validate(updateSchema), articleTypeController.update);
// Borrar un tipo de articulo (no se puede si hay articulos usandolo).
router.delete('/:id', requirePermission('article-types.delete'), articleTypeController.remove);

export default router;
