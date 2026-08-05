import { Router } from 'express';
import { z } from 'zod';
import * as invoiceController from '../controllers/invoiceController.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requirePermission } from '../middleware/rbac.middleware.js';
import { validate } from '../middleware/validate.middleware.js';

const router = Router();

const optionalRef = z.union([z.coerce.number().int().positive(), z.null()]).optional();

const itemSchema = z.object({
  description: z.string().trim().min(1, 'La descripcion es obligatoria'),
  item_type: z.enum(['bien', 'servicio']).default('servicio'),
  quantity: z.coerce.number().positive().default(1),
  unit_price: z.coerce.number().min(0).default(0),
});

const baseShape = {
  client_id: z.coerce.number().int().positive('El cliente es obligatorio'),
  quote_id: optionalRef,
  work_order_id: optionalRef,
  tipo_dte: z.string().trim().max(10).optional(),
  moneda: z.string().trim().length(3).optional(),
  // El precio unitario ya incluye IVA (igual que en cotizaciones/ordenes); el IVA se
  // extrae al certificar, no se suma aparte. Por eso no es un campo escribible aqui.
  descuento: z.coerce.number().min(0).optional(),
  observations: z.string().max(2000).optional().or(z.literal('')),
  items: z.array(itemSchema).min(1, 'Agrega al menos una linea'),
};

const createSchema = z.object(baseShape);
const updateSchema = z.object(baseShape).partial().refine(
  d => Object.keys(d).length > 0,
  { message: 'No hay cambios para aplicar' }
);
const voidSchema = z.object({
  motivo: z.string().trim().min(3, 'El motivo de anulacion es obligatorio'),
});

router.use(authenticate);

router.get('/',    requirePermission('invoices.view'),   invoiceController.list);
router.post('/',   requirePermission('invoices.create'), validate(createSchema), invoiceController.create);
router.get('/:id', requirePermission('invoices.view'),   invoiceController.getById);
router.put('/:id', requirePermission('invoices.create'), validate(updateSchema), invoiceController.update);
router.patch('/:id/void', requirePermission('invoices.void'), validate(voidSchema), invoiceController.voidInvoice);
router.post('/:id/certify', requirePermission('invoices.certify'), invoiceController.certify);
router.delete('/:id', requirePermission('invoices.delete'), invoiceController.remove);

export default router;
