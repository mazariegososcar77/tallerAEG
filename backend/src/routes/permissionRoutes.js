import { Router } from 'express';
import * as permissionController from '../controllers/permissionController.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requirePermission } from '../middleware/rbac.middleware.js';

const router = Router();

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
router.get('/', requirePermission('permissions.view'), permissionController.list);

export default router;
