import { Router } from 'express';
import { z } from 'zod';
import * as articleController from '../controllers/articleController.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requirePermission } from '../middleware/rbac.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { uploadImage } from '../middleware/upload.middleware.js';

const router = Router();

const createSchema = z.object({
  code: z.string().min(1, 'El codigo es obligatorio'),
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  type_id: z.coerce.number().int().positive('Tipo invalido'),
  warehouse_id: z.coerce.number().int().positive('Bodega invalida'),
  quantity: z.coerce.number().min(0).optional(),
  unit: z.string().max(30).optional(),
  price: z.coerce.number().min(0).optional(),
  brand: z.string().max(120).optional(),
  model: z.string().max(120).optional(),
  location: z.string().max(120).optional(),
  description: z.string().max(1000).optional(),
  image_url: z.string().max(500).optional(),
  is_active: z.boolean().optional(),
});

const updateSchema = createSchema.partial().refine((d) => Object.keys(d).length > 0, {
  message: 'No hay cambios para aplicar',
});

// El detalle de cada fila se valida en el servicio (mensajes por fila); aqui solo el contenedor.
const bulkSchema = z.object({
  items: z.array(z.record(z.any())).min(1, 'No hay filas para cargar'),
});

router.use(authenticate);

/**
 * @openapi
 * /articles/bulk:
 *   post:
 *     tags: [Articulos]
 *     summary: Carga masiva de articulos (filas con tipo y bodega por nombre)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: "Resumen { created, errors }" }
 */
router.post('/bulk', requirePermission('articles.create'), validate(bulkSchema), articleController.bulkCreate);

/**
 * @openapi
 * /articles/upload-image:
 *   post:
 *     tags: [Articulos]
 *     summary: Subir imagen de articulo (multipart, campo "image")
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image: { type: string, format: binary }
 *     responses:
 *       201: { description: "{ url }" }
 */
router.post('/upload-image', requirePermission('articles.create'), uploadImage, articleController.uploadImage);

/**
 * @openapi
 * /articles:
 *   get:
 *     tags: [Articulos]
 *     summary: Listar articulos (con type_name y warehouse_name)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Lista de articulos }
 *   post:
 *     tags: [Articulos]
 *     summary: Crear articulo
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Articulo creado }
 *       409: { description: Codigo duplicado }
 */
router.get('/', requirePermission('articles.view'), articleController.list);
router.post('/', requirePermission('articles.create'), validate(createSchema), articleController.create);

/**
 * @openapi
 * /articles/{id}:
 *   get:
 *     tags: [Articulos]
 *     summary: Obtener un articulo
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     responses:
 *       200: { description: Articulo }
 *       404: { description: No encontrado }
 *   put:
 *     tags: [Articulos]
 *     summary: Actualizar articulo
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     responses:
 *       200: { description: Articulo actualizado }
 *   delete:
 *     tags: [Articulos]
 *     summary: Eliminar articulo
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     responses:
 *       204: { description: Eliminado }
 */
router.get('/:id', requirePermission('articles.view'), articleController.getById);
router.put('/:id', requirePermission('articles.update'), validate(updateSchema), articleController.update);
router.delete('/:id', requirePermission('articles.delete'), articleController.remove);

export default router;
