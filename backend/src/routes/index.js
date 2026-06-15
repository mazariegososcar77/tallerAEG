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
import workOrderRoutes from './workOrderRoutes.js';
import machineRoutes from './machineRoutes.js';
import maintenanceRoutes from './maintenanceRoutes.js';
import quoteRoutes from './quoteRoutes.js';
import partCategoryRoutes from './partCategoryRoutes.js';

const router = Router();

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
router.use('/work-orders', workOrderRoutes);
router.use('/machines', machineRoutes);
router.use('/maintenance', maintenanceRoutes);
router.use('/quotes', quoteRoutes);
router.use('/part-categories', partCategoryRoutes);

export default router;
