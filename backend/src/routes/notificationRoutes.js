// Este archivo define las direcciones web (rutas) de la pantalla
// Configuracion > Notificaciones: el historial de avisos enviados, el aviso de
// prueba y el boton para forzar la revision diaria.
//
// No hay rutas para n8n. El sistema le manda los avisos a n8n (un POST al
// webhook configurado) y n8n nunca consulta nada de vuelta, asi que no hay
// ningun endpoint expuesto hacia afuera ni claves de integracion que repartir.
import { Router } from 'express';
import { z } from 'zod';
import * as notificationController from '../controllers/notificationController.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requirePermission } from '../middleware/rbac.middleware.js';
import { validate } from '../middleware/validate.middleware.js';

const router = Router();

const testSchema = z.object({ email: z.string().min(3).max(400) });

// A partir de aqui, todas las rutas de este archivo exigen haber iniciado sesion.
router.use(authenticate);

/**
 * @openapi
 * /notifications/log:
 *   get:
 *     tags: [Notificaciones]
 *     summary: Historial de avisos enviados
 *     description: Ultimos avisos registrados. Lo usa la pantalla Configuracion > Notificaciones.
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Lista de avisos enviados, del mas reciente al mas viejo }
 *       403: { description: Sin permiso settings.view }
 */
router.get('/log', requirePermission('settings.view'), notificationController.log);

/**
 * @openapi
 * /notifications/test:
 *   post:
 *     tags: [Notificaciones]
 *     summary: Mandar un aviso de prueba por el webhook de n8n
 *     description: >
 *       Sirve para comprobar que la URL del webhook quedo bien configurada sin
 *       esperar a que ocurra un evento real.
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: n8n recibio el aviso }
 *       400: { description: Falta la URL del webhook o el correo de prueba }
 *       403: { description: Sin permiso settings.update }
 *       502: { description: n8n no respondio }
 */
router.post('/test', requirePermission('settings.update'), validate(testSchema), notificationController.test);

/**
 * @openapi
 * /notifications/run:
 *   post:
 *     tags: [Notificaciones]
 *     summary: Revisar ahora los avisos que dependen del calendario
 *     description: >
 *       Corre en el momento la revision de stock bajo, mantenimientos y
 *       cotizaciones por vencer que normalmente ocurre una vez al dia. Es
 *       segura de repetir: lo que ya se aviso dentro de su ventana no se
 *       vuelve a mandar.
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Resumen de que paso con cada aviso }
 *       403: { description: Sin permiso settings.update }
 */
router.post('/run', requirePermission('settings.update'), notificationController.run);

export default router;
