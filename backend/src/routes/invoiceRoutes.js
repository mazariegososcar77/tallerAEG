// Este archivo define las direcciones web (rutas) para la FACTURACION: ver la lista de facturas,
// ver el detalle, certificar una factura y descargar su PDF.
import { Router } from 'express';
import { z } from 'zod';
import * as invoiceController from '../controllers/invoiceController.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requirePermission } from '../middleware/rbac.middleware.js';
import { validate } from '../middleware/validate.middleware.js';

const router = Router();

// Para certificar una factura: exige un correo con formato valido (a donde se le avisaria al cliente).
const certifySchema = z.object({
  email: z.string().trim().email('Correo invalido'),
});

// Para reenviar el PDF oficial: el correo es opcional (si no viene se usa el de la factura).
const sendEmailSchema = z.object({
  email: z.string().trim().email('Correo invalido').optional(),
});

// Para anular: el motivo es obligatorio (la SAT lo registra con la anulacion).
const cancelSchema = z.object({
  reason: z.string().trim().min(5, 'Escribe el motivo de la anulacion').max(255),
});

// A partir de aqui, todas las rutas de este archivo exigen haber iniciado sesion.
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
// Ver la lista de facturas.
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
// Ver el detalle de una factura especifica.
router.get('/fel/status', requirePermission('billing.view'), invoiceController.felStatus);
router.get('/nit/:nit', requirePermission('billing.view'), invoiceController.lookupNit);
router.get('/:id', requirePermission('billing.view'), invoiceController.getById);

/**
 * @openapi
 * /invoices/from-work-order/{workOrderId}:
 *   post:
 *     tags: [Facturacion]
 *     summary: Generar la factura de una orden de trabajo (flujo Post, manual)
 *     description: Requiere que la orden ya tenga una cotizacion aprobada (armada despues del reporte) y el reporte finalizado.
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: workOrderId, required: true, schema: { type: integer } }]
 *     responses:
 *       201: { description: Factura generada (o la ya existente, es idempotente) }
 *       400: { description: Falta la cotizacion aprobada o el reporte finalizado }
 */
// Generar la factura de una orden Post a mano (la cotizacion se arma despues del reporte, no hay factura automatica).
router.post('/from-work-order/:workOrderId', requirePermission('billing.create'), invoiceController.createFromWorkOrder);

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
// Certificar una factura (marcarla como certificada). Solo quien tiene el permiso de certificar.
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
// Descargar el PDF de la factura.
router.get('/:id/pdf', requirePermission('billing.view'), invoiceController.pdf);
// Archivos OFICIALES de la factura certificada (los que emite Digifact).
router.get('/:id/fel-pdf', requirePermission('billing.view'), invoiceController.felPdf);
router.get('/:id/fel-xml', requirePermission('billing.view'), invoiceController.felXml);
// Reenviar por correo el PDF oficial.
router.post('/:id/send-email', requirePermission('billing.certify'), validate(sendEmailSchema), invoiceController.sendEmail);
// Anular una factura certificada (motivo obligatorio).
router.post('/:id/cancel', requirePermission('billing.cancel'), validate(cancelSchema), invoiceController.cancel);

// Mapa de Relaciones: cadena de documentos (Cotizacion -> Orden -> Reporte -> Factura).
router.get('/:id/document-flow', requirePermission('billing.view'), invoiceController.documentFlow);

export default router;
