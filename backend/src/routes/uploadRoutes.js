// Este archivo define la direccion web que entrega el "permiso de subida": el
// navegador pide una URL firmada y sube el archivo directo a Google Cloud
// Storage. Es el reemplazo de los endpoints que recibian el archivo entero en
// el servidor.
import { Router } from 'express';
import { z } from 'zod';
import * as uploadController from '../controllers/uploadController.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';

const router = Router();

const subidaSchema = z.object({
  // Que se esta subiendo. Decide el prefijo dentro del bucket, que permiso hace
  // falta, que formatos se aceptan y el tamano maximo (ver uploadService.js).
  entidad: z.enum(['articulos', 'reportes', 'firmas', 'documentos']),
  content_type: z.string().min(3, 'Falta el tipo de archivo'),
  size_bytes: z.coerce.number().int().positive('Falta el tamano del archivo'),
});

// Todas estas rutas exigen sesion iniciada (el enlace publico de firma tiene la
// suya aparte, en publicRoutes.js, autorizada por su token).
router.use(authenticate);

/**
 * @openapi
 * /uploads/signed-url:
 *   post:
 *     tags: [Archivos]
 *     summary: Pedir una URL firmada para subir un archivo directo a Google Cloud Storage
 *     description: >
 *       Devuelve `{ modo: 'gcs', url_subida, ruta_objeto }` para subir con un PUT directo al
 *       bucket, o `{ modo: 'local' }` si el sistema todavia guarda en el disco del servidor
 *       (GCS_BUCKET sin configurar), en cuyo caso el frontend usa el endpoint multipart de
 *       siempre. La ruta devuelta es la que hay que mandar despues al endpoint que guarda el
 *       registro (foto de reporte, documento de orden, imagen de articulo).
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [entidad, content_type, size_bytes]
 *             properties:
 *               entidad: { type: string, enum: [articulos, reportes, firmas, documentos] }
 *               content_type: { type: string, example: image/jpeg }
 *               size_bytes: { type: integer, example: 348211 }
 *     responses:
 *       200: { description: URL firmada (o modo local) }
 *       400: { description: Tipo o tamano de archivo no permitido }
 *       403: { description: Sin permiso para subir este tipo de archivo }
 */
router.post('/signed-url', validate(subidaSchema), uploadController.crearSubida);

export default router;
