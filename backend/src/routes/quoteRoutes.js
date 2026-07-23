// Este archivo define las direcciones web (rutas) para manejar las COTIZACIONES: ver la lista,
// ver el detalle, crear, editar, cambiar su estado, borrar y descargar el PDF.
import { Router } from 'express';
import * as quoteController from '../controllers/quoteController.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requirePermission } from '../middleware/rbac.middleware.js';

const router = Router();
// A partir de aqui, todas las rutas de este archivo exigen haber iniciado sesion.
router.use(authenticate);

// Ver la lista de cotizaciones. (Nota: hoy solo exige el permiso general de "ver dashboard", no un permiso especifico de cotizaciones)
router.get('/',              requirePermission('dashboard.view'), quoteController.list);
// Ver el detalle de una cotizacion especifica.
router.get('/:id',           requirePermission('dashboard.view'), quoteController.getById);
// Crear una cotizacion nueva.
router.post('/',             requirePermission('dashboard.view'), quoteController.create);
// Editar una cotizacion existente.
router.put('/:id',           requirePermission('dashboard.view'), quoteController.update);
// Cambiar solo el estado de una cotizacion.
router.patch('/:id/status',  requirePermission('dashboard.view'), quoteController.updateStatus);
// Borrar una cotizacion.
router.delete('/:id',        requirePermission('dashboard.view'), quoteController.remove);
// Descargar el PDF de la cotizacion.
router.get('/:id/pdf',       requirePermission('dashboard.view'), quoteController.pdf);

export default router;
