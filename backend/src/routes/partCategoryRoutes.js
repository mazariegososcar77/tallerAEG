import { Router } from 'express';
import * as partCategoryController from '../controllers/partCategoryController.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requirePermission } from '../middleware/rbac.middleware.js';

const router = Router();
router.use(authenticate);

router.get('/',                    requirePermission('part-categories.view'),   partCategoryController.list);
router.get('/next-code/:prefix',   requirePermission('dashboard.view'),         partCategoryController.nextCode);
router.get('/:id',                 requirePermission('part-categories.view'),   partCategoryController.getById);
router.post('/',                   requirePermission('part-categories.create'), partCategoryController.create);
router.put('/:id',                 requirePermission('part-categories.update'), partCategoryController.update);
router.delete('/:id',              requirePermission('part-categories.delete'), partCategoryController.remove);

export default router;
