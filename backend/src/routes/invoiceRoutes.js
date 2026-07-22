import { Router } from 'express';
import { z } from 'zod';
import * as invoiceController from '../controllers/invoiceController.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requirePermission } from '../middleware/rbac.middleware.js';
import { validate } from '../middleware/validate.middleware.js';

const router = Router();

const certifySchema = z.object({
  email: z.string().trim().email('Correo invalido'),
});

router.use(authenticate);

/**
 * @openapi
 * /invoices:
 *   get:
 *     tags: [Facturacion]
 *     summary: Listar facturas
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Lista de facturas }
 */
router.get('/', requirePermission('billing.view'), invoiceController.list);

/**
 * @openapi
 * /invoices/{id}:
 *   get:
 *     tags: [Facturacion]
 *     summary: Obtener una factura (con sus lineas)
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     responses:
 *       200: { description: Factura }
 *       404: { description: No encontrada }
 */
router.get('/:id', requirePermission('billing.view'), invoiceController.getById);

/**
 * @openapi
 * /invoices/{id}/certify:
 *   post:
 *     tags: [Facturacion]
 *     summary: Certificar una factura (marca el estado interno; certificacion FEL real pendiente de integrar)
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema: { type: object, properties: { email: { type: string } }, required: [email] }
 *     responses:
 *       200: { description: Factura certificada }
 */
router.post('/:id/certify', requirePermission('billing.certify'), validate(certifySchema), invoiceController.certify);

/**
 * @openapi
 * /invoices/{id}/pdf:
 *   get:
 *     tags: [Facturacion]
 *     summary: Descargar el PDF de la factura
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     responses:
 *       200: { description: PDF de la factura }
 */
router.get('/:id/pdf', requirePermission('billing.view'), invoiceController.pdf);

export default router;
