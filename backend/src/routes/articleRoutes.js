// Este archivo define las direcciones web (rutas) para manejar los ARTICULOS del inventario:
// ver la lista, ver el detalle, crear, editar, borrar, subir su imagen y cargarlos en masa desde Excel.
import { Router } from 'express';
import { z } from 'zod';
import * as articleController from '../controllers/articleController.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requirePermission } from '../middleware/rbac.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { uploadImage } from '../middleware/upload.middleware.js';

const router = Router();

// Datos que se piden para crear un articulo nuevo: codigo y nombre son obligatorios,
// tipo y bodega deben ser validos, y el resto (cantidad, precio, marca, piezas, mano de obra, etc.) es opcional.
const createSchema = z.object({
  code: z.string().min(1, 'El codigo es obligatorio'),
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  type_id: z.coerce.number().int().positive('Tipo invalido'),
  warehouse_id: z.coerce.number().int().positive('Bodega invalida'),
  // Existencia inicial. Solo se acepta al CREAR: no se escribe directo en la columna,
  // se convierte en un movimiento 'saldo_inicial' del kardex (ver articleService.create).
  quantity: z.coerce.number().min(0).optional(),
  unit: z.string().max(30).optional(),
  // Precio de VENTA (lo que se le cobra al cliente).
  price: z.coerce.number().min(0).optional(),
  // Precio de COMPRA (lo que le cuesta a AEG). Es lo que valua el kardex: usar aqui el
  // precio de venta daria un costo de trabajo falso.
  //
  // Distingue "vacio" de "cero" a proposito: un campo en blanco llega como null, que en
  // la columna significa "todavia no se ha capturado el costo" (ver 033_stock_movements.sql),
  // y eso NO es lo mismo que un costo real de Q0.00. Sin el preprocess, zod convertiria
  // el string vacio en 0 y estariamos inventando un dato que nadie capturo.
  cost: z.preprocess(
    (v) => (v === '' ? null : v),
    z.coerce.number().min(0).nullable().optional()
  ),
  brand: z.string().max(120).optional(),
  model: z.string().max(120).optional(),
  location: z.string().max(120).optional(),
  description: z.string().max(1000).optional(),
  image_url: z.string().max(500).optional(),
  is_active: z.boolean().optional(),
  // Piezas que componen el articulo (lista de nombres). Se guardan en su propia tabla.
  pieces: z.array(z.string().trim().min(1).max(190)).optional(),
  // Mano de obra del articulo (lista de nombres). Se guarda en su propia tabla.
  labor: z.array(z.string().trim().min(1).max(190)).optional(),
});

// Para editar un articulo: los mismos datos de arriba pero todos opcionales (se manda solo lo que cambia),
// y exige que venga al menos un cambio.
//
// `quantity` queda FUERA a proposito: la existencia de un articulo no se edita desde su
// ficha. Solo cambia por un movimiento del kardex (consumo de un reporte, ajuste manual o
// saldo inicial), que es lo que permite responder despues "por que hay 7 y no 10". Como el
// middleware de validacion reemplaza el body por el dato ya parseado y zod descarta las
// claves que no estan en el schema, un cliente que igual la mande no recibe un error: se
// ignora en silencio y el resto de sus cambios se guarda normal.
const updateSchema = createSchema
  .partial()
  .omit({ quantity: true })
  .refine((d) => Object.keys(d).length > 0, {
    message: 'No hay cambios para aplicar',
  });

// Para la carga masiva por Excel: exige que venga al menos una fila. El detalle de cada fila se valida en el servicio (mensajes por fila); aqui solo el contenedor.
const bulkSchema = z.object({
  items: z.array(z.record(z.any())).min(1, 'No hay filas para cargar'),
});

// A partir de aqui, todas las rutas de este archivo exigen haber iniciado sesion.
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
// Cargar muchos articulos de una vez (desde un Excel). Solo quien puede crear articulos.
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
// Subir la foto de un articulo. Solo quien puede crear articulos.
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
// Ver la lista de articulos del inventario.
router.get('/', requirePermission('articles.view'), articleController.list);
// Crear un articulo nuevo.
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
// Ver el detalle de un articulo especifico.
router.get('/:id', requirePermission('articles.view'), articleController.getById);
// Editar un articulo existente.
router.put('/:id', requirePermission('articles.update'), validate(updateSchema), articleController.update);
// Borrar un articulo.
router.delete('/:id', requirePermission('articles.delete'), articleController.remove);

export default router;
