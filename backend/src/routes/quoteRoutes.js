import { Router } from 'express';
import * as quoteController from '../controllers/quoteController.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requirePermission } from '../middleware/rbac.middleware.js';

const router = Router();
router.use(authenticate);

router.get('/',              requirePermission('dashboard.view'), quoteController.list);
router.get('/:id',           requirePermission('dashboard.view'), quoteController.getById);
router.post('/',             requirePermission('dashboard.view'), quoteController.create);
router.put('/:id',           requirePermission('dashboard.view'), quoteController.update);
router.patch('/:id/status',  requirePermission('dashboard.view'), quoteController.updateStatus);
router.delete('/:id',        requirePermission('dashboard.view'), quoteController.remove);
router.get('/:id/pdf',       requirePermission('dashboard.view'), quoteController.pdf);

export default router;
