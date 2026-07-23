// Este archivo define las direcciones web (rutas) para INICIAR SESION, ver el usuario conectado
// y CERRAR SESION en el sistema.
import { Router } from 'express';
import { z } from 'zod';
import * as authController from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';

const router = Router();

// Para iniciar sesion: exige correo con formato valido y una contrasena (no puede venir vacia).
const loginSchema = z.object({
  email: z.string().email('Correo invalido'),
  password: z.string().min(1, 'La contrasena es obligatoria'),
});

/**
 * @openapi
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Iniciar sesion
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, example: admin@talleraeg.com }
 *               password: { type: string, example: Admin123! }
 *     responses:
 *       200:
 *         description: Token JWT y perfil del usuario
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token: { type: string }
 *                 user: { $ref: '#/components/schemas/UserProfile' }
 *       401: { description: Credenciales invalidas }
 */
// Iniciar sesion con correo y contrasena. Cualquiera puede intentarlo (aun no ha iniciado sesion).
router.post('/login', validate(loginSchema), authController.login);

/**
 * @openapi
 * /auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Perfil del usuario autenticado
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Perfil actual
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/UserProfile' }
 *       401: { description: No autenticado }
 */
// Ver los datos del usuario que tiene la sesion abierta actualmente.
router.get('/me', authenticate, authController.me);

/**
 * @openapi
 * /auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Cerrar sesion (stateless)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Sesion cerrada }
 */
// Cerrar la sesion actual.
router.post('/logout', authenticate, authController.logout);

export default router;
