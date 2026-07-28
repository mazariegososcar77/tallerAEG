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
import { uploadReportPhoto } from '../middleware/upload.middleware.js';

const router = Router();

const signatureSchema = z.object({
  name: z.string().trim().min(2, 'Escribe el nombre de quien recibe'),
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
router.post('/work-reports/:token/signature', uploadReportPhoto, validate(signatureSchema), publicController.setWorkReportSignature);

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
router.post('/service-orders/:token/signature', uploadReportPhoto, validate(signatureSchema), publicController.setServiceOrderSignature);

export default router;
