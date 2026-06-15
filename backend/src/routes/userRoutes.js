import { Router } from 'express';
import { z } from 'zod';
import * as userController from '../controllers/userController.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requirePermission } from '../middleware/rbac.middleware.js';
import { validate } from '../middleware/validate.middleware.js';

const router = Router();

const createSchema = z.object({
  name:      z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  email:     z.string().email('Correo invalido'),
  password:  z.string().min(6, 'La contrasena debe tener al menos 6 caracteres'),
  role_id:   z.coerce.number().int().positive('Rol invalido'),
  is_active: z.boolean().optional(),
});

const updateSchema = z.object({
  name:      z.string().min(2).optional(),
  email:     z.string().email('Correo invalido').optional(),
  password:  z.string().min(6, 'La contrasena debe tener al menos 6 caracteres').optional().or(z.literal('')),
  role_id:   z.coerce.number().int().positive().optional(),
  is_active: z.boolean().optional(),
});

router.use(authenticate);
router.get('/',    requirePermission('users.view'),   userController.list);
router.post('/',   requirePermission('users.create'), validate(createSchema), userController.create);
router.get('/:id', requirePermission('users.view'),   userController.getById);
router.put('/:id', requirePermission('users.update'), validate(updateSchema), userController.update);
router.delete('/:id', requirePermission('users.delete'), userController.remove);

export default router;
