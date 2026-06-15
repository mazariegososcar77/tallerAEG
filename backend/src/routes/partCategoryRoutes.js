import { Router } from 'express';
import * as partCategoryController from '../controllers/partCategoryController.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requirePermission } from '../middleware/rbac.middleware.js';

const router = Router();
router.use(authenticate);

router.get('/',                    requirePermission('dashboard.view'), partCategoryController.list);
router.get('/next-code/:prefix',   requirePermission('dashboard.view'), partCategoryController.nextCode);
router.get('/:id',                 requirePermission('dashboard.view'), partCategoryController.getById);
router.post('/',                   requirePermission('dashboard.view'), partCategoryController.create);
router.put('/:id',                 requirePermission('dashboard.view'), partCategoryController.update);
router.delete('/:id',              requirePermission('dashboard.view'), partCategoryController.remove);

export default router;
