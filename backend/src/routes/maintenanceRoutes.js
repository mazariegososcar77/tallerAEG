// Este archivo define las direcciones web (rutas) para manejar el CALENDARIO DE MANTENIMIENTO
// de las maquinas de los clientes: ver los proximos, ver la lista completa, ver el detalle, crear,
// editar y borrar.
import { Router } from 'express';
import * as maintenanceController from '../controllers/maintenanceController.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requirePermission } from '../middleware/rbac.middleware.js';
const router = Router();
// A partir de aqui, todas las rutas de este archivo exigen haber iniciado sesion.
router.use(authenticate);
// Ver los mantenimientos proximos (que ya estan por vencer o vencidos).
router.get('/upcoming', requirePermission('dashboard.view'), maintenanceController.upcoming);
// Ver la lista completa de mantenimientos programados. (Nota: hoy solo exige el permiso general de "ver dashboard")
router.get('/', requirePermission('dashboard.view'), maintenanceController.list);
// Ver el detalle de un mantenimiento especifico.
router.get('/:id', requirePermission('dashboard.view'), maintenanceController.getById);
// Crear un mantenimiento programado nuevo.
router.post('/', requirePermission('dashboard.view'), maintenanceController.create);
// Editar un mantenimiento programado existente.
router.put('/:id', requirePermission('dashboard.view'), maintenanceController.update);
// Borrar un mantenimiento programado.
router.delete('/:id', requirePermission('dashboard.view'), maintenanceController.remove);
export default router;
