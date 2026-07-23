// Este archivo define las direcciones web (rutas) para manejar las ÓRDENES DE SERVICIO
// (trabajos subcontratados fuera del taller): ver la lista, ver el detalle, crear,
// editar, cambiar su estado, borrar y descargar el PDF.
//
// A diferencia de Órdenes de Trabajo (que hoy solo usa el permiso generico
// "dashboard.view"), este modulo usa permisos granulares propios desde el inicio
// (service-orders.*) -- es justamente lo que permite que el rol "Subcontrato" pueda
// ver ESTO sin heredar acceso a ningun otro modulo del sistema.
import { Router } from 'express';
import * as serviceOrderController from '../controllers/serviceOrderController.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requirePermission } from '../middleware/rbac.middleware.js';

const router = Router();
router.use(authenticate);

/**
 * @openapi
 * /service-orders:
 *   get:
 *     tags: [Ordenes de Servicio]
 *     summary: Listar ordenes de servicio
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Lista de ordenes de servicio }
 *   post:
 *     tags: [Ordenes de Servicio]
 *     summary: Crear orden de servicio
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Orden de servicio creada }
 */
router.get('/',              requirePermission('service-orders.view'),   serviceOrderController.list);
router.post('/',             requirePermission('service-orders.create'), serviceOrderController.create);

/**
 * @openapi
 * /service-orders/{id}:
 *   get:
 *     tags: [Ordenes de Servicio]
 *     summary: Obtener una orden de servicio
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     responses:
 *       200: { description: Orden de servicio }
 *   put:
 *     tags: [Ordenes de Servicio]
 *     summary: Actualizar orden de servicio
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     responses:
 *       200: { description: Orden de servicio actualizada }
 *   delete:
 *     tags: [Ordenes de Servicio]
 *     summary: Eliminar orden de servicio
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     responses:
 *       204: { description: Eliminada }
 */
router.get('/:id',           requirePermission('service-orders.view'),   serviceOrderController.getById);
router.put('/:id',           requirePermission('service-orders.update'), serviceOrderController.update);
router.delete('/:id',        requirePermission('service-orders.delete'), serviceOrderController.remove);

// Cambiar solo el estado de una orden de servicio (enviada, en_proceso, recibida, cancelada).
router.patch('/:id/status',  requirePermission('service-orders.update'), serviceOrderController.updateStatus);

// Descargar el PDF de la orden de servicio.
router.get('/:id/pdf',       requirePermission('service-orders.view'),   serviceOrderController.pdf);

export default router;
