// Este archivo define las direcciones web (rutas) para manejar los USUARIOS del sistema
// (las cuentas con las que la gente inicia sesion): ver, crear, editar y borrar.
import { Router } from 'express';
import { z } from 'zod';
import * as userController from '../controllers/userController.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requirePermission } from '../middleware/rbac.middleware.js';
import { validate } from '../middleware/validate.middleware.js';

const router = Router();

// Para crear un usuario: nombre y correo obligatorios (con formato valido), contrasena de al menos
// 6 caracteres, y un rol valido asignado.
const createSchema = z.object({
  name:      z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  email:     z.string().email('Correo invalido'),
  password:  z.string().min(6, 'La contrasena debe tener al menos 6 caracteres'),
  role_id:   z.coerce.number().int().positive('Rol invalido'),
  is_active: z.boolean().optional(),
});

// Para editar un usuario: los mismos datos pero opcionales (la contrasena se puede dejar vacia para no cambiarla).
const updateSchema = z.object({
  name:      z.string().min(2).optional(),
  email:     z.string().email('Correo invalido').optional(),
  password:  z.string().min(6, 'La contrasena debe tener al menos 6 caracteres').optional().or(z.literal('')),
  role_id:   z.coerce.number().int().positive().optional(),
  is_active: z.boolean().optional(),
});

// A partir de aqui, todas las rutas de este archivo exigen haber iniciado sesion.
router.use(authenticate);
// Ver la lista de usuarios.
router.get('/',    requirePermission('users.view'),   userController.list);
// Crear un usuario nuevo.
router.post('/',   requirePermission('users.create'), validate(createSchema), userController.create);
// Ver el detalle de un usuario especifico.
router.get('/:id', requirePermission('users.view'),   userController.getById);
// Editar un usuario existente.
router.put('/:id', requirePermission('users.update'), validate(updateSchema), userController.update);
// Borrar un usuario.
router.delete('/:id', requirePermission('users.delete'), userController.remove);

export default router;
