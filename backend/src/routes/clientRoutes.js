// Este archivo define las direcciones web (rutas) para manejar los CLIENTES del taller:
// ver la lista, ver el detalle, crear (normal o rapido), editar, validar y borrar.
import { Router } from 'express';
import { z } from 'zod';
import * as clientController from '../controllers/clientController.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requirePermission } from '../middleware/rbac.middleware.js';
import { validate } from '../middleware/validate.middleware.js';

const router = Router();

// Una referencia (a un tipo de cliente o nivel de fidelizacion) es opcional: puede venir vacia (null).
const optionalRef = z.union([z.coerce.number().int().positive(), z.null()]).optional();

// Datos que se piden para crear o editar un cliente: el nombre y el telefono son obligatorios,
// el correo (si viene) debe tener formato valido, y debe existir NIT o DPI (se revisa aparte en el servicio).
const baseShape = {
  nit:           z.string().trim().max(20).optional(),
  dpi:           z.string().trim().max(20).optional(),
  first_name:    z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres'),
  last_name:     z.string().trim().max(150).optional().or(z.literal('')),
  trade_name:    z.string().trim().max(255).optional().or(z.literal('')),
  contact_name:  z.string().trim().max(150).optional().or(z.literal('')),
  dependency:    z.string().trim().max(150).optional().or(z.literal('')),
  email:         z.string().trim().max(190).email('Correo invalido').optional().or(z.literal('')),
  address:       z.string().max(255).optional(),
  phone:         z.string().trim().min(5, 'El telefono es obligatorio'),
  client_type_id:  optionalRef,
  loyalty_tier_id: optionalRef,
  is_active:     z.boolean().optional(),
};

const createSchema = z.object(baseShape);
// Para editar un cliente: los mismos datos pero opcionales, y debe venir al menos un cambio.
const updateSchema = z.object(baseShape).partial().refine(
  d => Object.keys(d).length > 0,
  { message: 'No hay cambios para aplicar' }
);

// A partir de aqui, todas las rutas de este archivo exigen haber iniciado sesion.
router.use(authenticate);

// Ver la lista de clientes.
router.get('/',    requirePermission('clients.view'),   clientController.list);
// Crear un cliente nuevo (con todos los datos validados).
router.post('/',   requirePermission('clients.create'), validate(createSchema), clientController.create);
// Alta rapida desde ordenes/cotizaciones: crea el cliente sin validar.
router.post('/quick', requirePermission('clients.quick-create'), validate(createSchema), clientController.quickCreate);
// Ver el detalle de un cliente especifico.
router.get('/:id', requirePermission('clients.view'),   clientController.getById);
// Marca un cliente como validado (revision del administrador).
router.patch('/:id/validate', requirePermission('clients.validate'), clientController.validate);
// Editar un cliente existente.
router.put('/:id', requirePermission('clients.update'), validate(updateSchema), clientController.update);
// Borrar un cliente.
router.delete('/:id', requirePermission('clients.delete'), clientController.remove);

export default router;
