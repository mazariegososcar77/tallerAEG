import { Router } from 'express';
import * as workOrderController from '../controllers/workOrderController.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requirePermission } from '../middleware/rbac.middleware.js';

const router = Router();
router.use(authenticate);

router.get('/',              requirePermission('dashboard.view'), workOrderController.list);
router.get('/:id',           requirePermission('dashboard.view'), workOrderController.getById);
router.post('/',             requirePermission('dashboard.view'), workOrderController.create);
router.put('/:id',           requirePermission('dashboard.view'), workOrderController.update);
router.patch('/:id/status',  requirePermission('dashboard.view'), workOrderController.updateStatus);
router.delete('/:id',        requirePermission('dashboard.view'), workOrderController.remove);
router.get('/:id/pdf',       requirePermission('dashboard.view'), workOrderController.pdf);

export default router;
