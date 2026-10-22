// Este archivo define las direcciones web (rutas) para manejar las MAQUINAS de los clientes
// (los equipos que se les da mantenimiento): ver, crear, editar y borrar.
import { Router } from 'express';
import * as machineController from '../controllers/machineController.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requirePermission } from '../middleware/rbac.middleware.js';
const router = Router();
// A partir de aqui, todas las rutas de este archivo exigen haber iniciado sesion.
router.use(authenticate);
// Ver la lista de maquinas. Permiso propio (no el generico "dashboard.view") para que
// un formulario que solo necesita ELEGIR una maquina (ej. MachinePicker en Ordenes de
// Trabajo) no obligue a dar tambien el modulo completo de Maquinas y Mantenimiento.
router.get('/', requirePermission('machines.view'), machineController.list);
// Ver el detalle de una maquina especifica.
router.get('/:id', requirePermission('machines.view'), machineController.getById);
// Crear una maquina nueva.
router.post('/', requirePermission('dashboard.view'), machineController.create);
// Editar una maquina existente.
router.put('/:id', requirePermission('dashboard.view'), machineController.update);
// Borrar una maquina.
router.delete('/:id', requirePermission('dashboard.view'), machineController.remove);
export default router;
