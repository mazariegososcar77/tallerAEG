// Este archivo define la direccion web (ruta) para ver el catalogo completo de PERMISOS
// del sistema (las "llaves" que se le pueden asignar a un rol).
import { Router } from 'express';
import * as permissionController from '../controllers/permissionController.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requirePermission } from '../middleware/rbac.middleware.js';

const router = Router();

// A partir de aqui, todas las rutas de este archivo exigen haber iniciado sesion.
router.use(authenticate);

/**
 * @openapi
 * /permissions:
 *   get:
 *     tags: [Permisos]
 *     summary: Listar el catalogo de permisos
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Lista de permisos
 *         content:
 *           application/json:
 *             schema: { type: array, items: { $ref: '#/components/schemas/Permission' } }
 */
// Ver la lista de permisos disponibles.
router.get('/', requirePermission('permissions.view'), permissionController.list);

export default router;
