// Este archivo define las direcciones web (rutas) para manejar las ORDENES DE TRABAJO
// (la ficha del equipo que entra al taller): ver la lista, ver el detalle, crear, editar,
// cambiar su estado, borrar y descargar el PDF.
import { Router } from 'express';
import * as workOrderController from '../controllers/workOrderController.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requirePermission } from '../middleware/rbac.middleware.js';

const router = Router();
// A partir de aqui, todas las rutas de este archivo exigen haber iniciado sesion.
router.use(authenticate);

// Ver la lista de ordenes de trabajo. (Nota: hoy solo exige el permiso general de "ver dashboard", no un permiso especifico de ordenes)
router.get('/',              requirePermission('dashboard.view'), workOrderController.list);
// Ver el detalle de una orden especifica.
router.get('/:id',           requirePermission('dashboard.view'), workOrderController.getById);
// Crear una orden de trabajo nueva.
router.post('/',             requirePermission('dashboard.view'), workOrderController.create);
// Editar una orden de trabajo existente.
router.put('/:id',           requirePermission('dashboard.view'), workOrderController.update);
// Cambiar solo el estado de una orden (recibido, en proceso, listo, entregado, cancelado).
router.patch('/:id/status',  requirePermission('dashboard.view'), workOrderController.updateStatus);
// Borrar una orden de trabajo.
router.delete('/:id',        requirePermission('dashboard.view'), workOrderController.remove);
// Descargar el PDF de la orden de trabajo.
router.get('/:id/pdf',       requirePermission('dashboard.view'), workOrderController.pdf);

export default router;
