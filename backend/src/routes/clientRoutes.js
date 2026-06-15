import { Router } from 'express';
import { z } from 'zod';
import * as clientController from '../controllers/clientController.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requirePermission } from '../middleware/rbac.middleware.js';
import { validate } from '../middleware/validate.middleware.js';

const router = Router();

const optionalRef = z.union([z.coerce.number().int().positive(), z.null()]).optional();

const baseShape = {
  nit:           z.string().trim().max(20).optional(),
  dpi:           z.string().trim().max(20).optional(),
  first_name:    z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres'),
  last_name:     z.string().trim().max(150).optional().or(z.literal('')),
  trade_name:    z.string().trim().max(255).optional().or(z.literal('')),
  contact_name:  z.string().trim().max(150).optional().or(z.literal('')),
  dependency:    z.string().trim().max(150).optional().or(z.literal('')),
  email:         z.string().trim().max(190).email('Correo invalido').optional().or(z.literal('')),
  address:       z.string().max(255).optional(),
  phone:         z.string().trim().min(5, 'El telefono es obligatorio'),
  client_type_id:  optionalRef,
  loyalty_tier_id: optionalRef,
  is_active:     z.boolean().optional(),
};

const createSchema = z.object(baseShape);
const updateSchema = z.object(baseShape).partial().refine(
  d => Object.keys(d).length > 0,
  { message: 'No hay cambios para aplicar' }
);

router.use(authenticate);

router.get('/',    requirePermission('clients.view'),   clientController.list);
router.post('/',   requirePermission('clients.create'), validate(createSchema), clientController.create);
router.get('/:id', requirePermission('clients.view'),   clientController.getById);
router.put('/:id', requirePermission('clients.update'), validate(updateSchema), clientController.update);
router.delete('/:id', requirePermission('clients.delete'), clientController.remove);

export default router;
