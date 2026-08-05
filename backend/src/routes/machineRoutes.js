// Este archivo define las direcciones web (rutas) para manejar las MAQUINAS de los clientes
// (los equipos que se les da mantenimiento): ver, crear, editar y borrar.
import { Router } from 'express';
import * as machineController from '../controllers/machineController.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requirePermission } from '../middleware/rbac.middleware.js';
const router = Router();
// A partir de aqui, todas las rutas de este archivo exigen haber iniciado sesion.
router.use(authenticate);
// Ver la lista de maquinas. (Nota: hoy solo exige el permiso general de "ver dashboard", no un permiso especifico de maquinas)
router.get('/', requirePermission('dashboard.view'), machineController.list);
// Ver el detalle de una maquina especifica.
router.get('/:id', requirePermission('dashboard.view'), machineController.getById);
// Crear una maquina nueva.
router.post('/', requirePermission('dashboard.view'), machineController.create);
// Editar una maquina existente.
router.put('/:id', requirePermission('dashboard.view'), machineController.update);
// Borrar una maquina.
router.delete('/:id', requirePermission('dashboard.view'), machineController.remove);
export default router;
