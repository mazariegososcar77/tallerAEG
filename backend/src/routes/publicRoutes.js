// Este archivo define las direcciones web PUBLICAS del sistema: a diferencia de todo
// el resto de rutas (ver routes/index.js), estas NO exigen haber iniciado sesion --
// a proposito, ver publicController.js. Hoy solo existe el enlace de firma remota del
// cliente (para cuando el equipo se entrega con mensajero y el cliente no esta en el
// taller): el token largo y aleatorio en la URL hace de "contraseña de un solo uso"
// para ESE reporte especifico, nada mas del sistema queda expuesto.
import { Router } from 'express';
import { z } from 'zod';
import * as publicController from '../controllers/publicController.js';
import { validate } from '../middleware/validate.middleware.js';
import { uploadReportPhoto, soloSiEsMultipart } from '../middleware/upload.middleware.js';

const router = Router();

const signatureSchema = z.object({
  name: z.string().trim().min(2, 'Escribe el nombre de quien recibe'),
  // Ruta del objeto que el navegador ya subio a Google Cloud Storage. Va vacia
  // cuando el almacenamiento en la nube no esta configurado y la firma llega
  // como archivo multipart, igual que antes.
  object_path: z.string().max(500).optional(),
});

// Datos que necesita el backend para firmar la subida de la firma. La
// autorizacion es el token de la URL, no una sesion (ver publicController).
const subidaSchema = z.object({
  content_type: z.string().min(3, 'Falta el tipo de archivo'),
  size_bytes: z.coerce.number().int().positive('Falta el tamano del archivo'),
});

/**
 * @openapi
 * /public/work-reports/{token}:
 *   get:
 *     tags: [Enlace publico de firma]
 *     summary: Datos minimos de un reporte de trabajo por su token de firma remota (sin sesion)
 *     parameters: [{ in: path, name: token, required: true, schema: { type: string } }]
 *     responses:
 *       200: { description: Datos del reporte (numero, equipo, cliente, si ya esta firmado) }
 *       404: { description: Enlace invalido o vencido }
 */
router.get('/work-reports/:token', publicController.getWorkReportByToken);

/**
 * @openapi
 * /public/work-reports/{token}/signature:
 *   post:
 *     tags: [Enlace publico de firma]
 *     summary: Guardar la firma del cliente (dibujada en el enlace publico, sin sesion)
 *     parameters: [{ in: path, name: token, required: true, schema: { type: string } }]
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               photo: { type: string, format: binary }
 *               name: { type: string }
 *     responses:
 *       200: { description: Firma guardada }
 *       404: { description: Enlace invalido o vencido }
 *       409: { description: El reporte ya esta finalizado }
 */
router.post('/work-reports/:token/signature', soloSiEsMultipart(uploadReportPhoto), validate(signatureSchema), publicController.setWorkReportSignature);

/**
 * @openapi
 * /public/work-reports/{token}/signature/signed-url:
 *   post:
 *     tags: [Enlace publico de firma]
 *     summary: URL firmada para subir la firma directo a Google Cloud Storage (sin sesion)
 *     description: >
 *       Autoriza por el token del enlace, no por sesion. Devuelve `{ modo: 'local' }` si el
 *       sistema todavia guarda en el disco del servidor, y en ese caso el navegador manda la
 *       firma como multipart al endpoint de arriba.
 *     parameters: [{ in: path, name: token, required: true, schema: { type: string } }]
 *     responses:
 *       200: { description: URL firmada (o modo local) }
 *       404: { description: Enlace invalido o vencido }
 */
router.post('/work-reports/:token/signature/signed-url', validate(subidaSchema), publicController.crearSubidaFirmaReporte);

/**
 * @openapi
 * /public/service-orders/{token}:
 *   get:
 *     tags: [Enlace publico de firma]
 *     summary: Datos minimos de una orden de servicio por su token de firma remota (sin sesion)
 *     parameters: [{ in: path, name: token, required: true, schema: { type: string } }]
 *     responses:
 *       200: { description: Datos de la orden (numero, equipo, cliente, si ya esta firmada) }
 *       404: { description: Enlace invalido o vencido }
 */
router.get('/service-orders/:token', publicController.getServiceOrderByToken);

/**
 * @openapi
 * /public/service-orders/{token}/signature:
 *   post:
 *     tags: [Enlace publico de firma]
 *     summary: Guardar la firma del cliente en una orden de servicio (sin sesion)
 *     parameters: [{ in: path, name: token, required: true, schema: { type: string } }]
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               photo: { type: string, format: binary }
 *               name: { type: string }
 *     responses:
 *       200: { description: Firma guardada }
 *       404: { description: Enlace invalido o vencido }
 */
router.post('/service-orders/:token/signature', soloSiEsMultipart(uploadReportPhoto), validate(signatureSchema), publicController.setServiceOrderSignature);

/**
 * @openapi
 * /public/service-orders/{token}/signature/signed-url:
 *   post:
 *     tags: [Enlace publico de firma]
 *     summary: URL firmada para subir la firma de una orden de servicio (sin sesion)
 *     parameters: [{ in: path, name: token, required: true, schema: { type: string } }]
 *     responses:
 *       200: { description: URL firmada (o modo local) }
 *       404: { description: Enlace invalido o vencido }
 */
router.post('/service-orders/:token/signature/signed-url', validate(subidaSchema), publicController.crearSubidaFirmaOrdenServicio);

export default router;
