import { Router } from 'express';
import authRoutes from './authRoutes.js';
import userRoutes from './userRoutes.js';
import roleRoutes from './roleRoutes.js';
import permissionRoutes from './permissionRoutes.js';
import warehouseRoutes from './warehouseRoutes.js';
import articleTypeRoutes from './articleTypeRoutes.js';
import articleRoutes from './articleRoutes.js';
import clientTypeRoutes from './clientTypeRoutes.js';
import loyaltyTierRoutes from './loyaltyTierRoutes.js';
import clientRoutes from './clientRoutes.js';

const router = Router();

/**
 * @openapi
 * /health:
 *   get:
 *     tags: [Sistema]
 *     summary: Healthcheck
 *     responses:
 *       200: { description: El servicio esta arriba }
 */
router.get('/health', (_req, res) => res.json({ status: 'ok' }));

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/roles', roleRoutes);
router.use('/permissions', permissionRoutes);
router.use('/warehouses', warehouseRoutes);
router.use('/article-types', articleTypeRoutes);
router.use('/articles', articleRoutes);
router.use('/client-types', clientTypeRoutes);
router.use('/loyalty-tiers', loyaltyTierRoutes);
router.use('/clients', clientRoutes);

export default router;
