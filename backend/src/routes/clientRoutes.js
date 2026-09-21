// Este archivo define las direcciones web (rutas) para manejar los CLIENTES del taller:
// ver la lista, ver el detalle, crear (normal o rapido), editar, validar y borrar.
import { Router } from 'express';
import { z } from 'zod';
import { booleanFlag } from '../utils/zodHelpers.js';
import { isValidNit, isValidDpi, isValidPhone, MENSAJES } from '../utils/guatemala.js';
import * as clientController from '../controllers/clientController.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requirePermission } from '../middleware/rbac.middleware.js';
import { validate } from '../middleware/validate.middleware.js';

const router = Router();

// Una referencia (a un tipo de cliente o nivel de fidelizacion) es opcional: puede venir vacia (null).
const optionalRef = z.union([z.coerce.number().int().positive(), z.null()]).optional();

// Un contacto del cliente: correo (obligatorio, formato valido) + el nombre de la
// persona dueña de ese correo (opcional -- puede que solo se sepa el correo).
const contactSchema = z.object({
  email: z.string().trim().min(1, 'Escribe el correo del contacto o quita esa fila.').max(190).email(),
  name:  z.string().trim().max(150).optional().or(z.literal('')),
});

// Datos que se piden para crear o editar un cliente: el nombre y el telefono son obligatorios,
// y debe existir NIT o DPI (se revisa aparte en el servicio). "contacts", si viene, REEMPLAZA
// por completo la lista de contactos del cliente (no es un patch fila por fila).
const baseShape = {
  nit:           z.string().trim().max(30).refine((v) => v === '' || isValidNit(v), MENSAJES.nit).nullish(),
  dpi:           z.string().trim().max(30).refine((v) => v === '' || isValidDpi(v), MENSAJES.dpi).nullish(),
  first_name:    z.string().trim().min(2, 'El nombre debe tener al menos 2 letras.'),
  last_name:     z.string().trim().max(150).optional().or(z.literal('')),
  trade_name:    z.string().trim().max(255).optional().or(z.literal('')),
  contact_name:  z.string().trim().max(150).optional().or(z.literal('')),
  dependency:    z.string().trim().max(150).optional().or(z.literal('')),
  contacts:      z.array(contactSchema).optional(),
  address:       z.string().max(255).optional(),
  phone:         z.string().trim().min(1, 'El teléfono es obligatorio.').refine(isValidPhone, MENSAJES.phone),
  client_type_id:  optionalRef,
  loyalty_tier_id: optionalRef,
  is_active:     booleanFlag.optional(),
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
// Ver el "historial de equipo" del cliente: sus maquinas, y las cotizaciones/ordenes/
// visitas de servicio de cada una, mas el total facturado historicamente.
router.get('/:id/history', requirePermission('clients.view'), clientController.getHistory);
// Marca un cliente como validado (revision del administrador).
router.patch('/:id/validate', requirePermission('clients.validate'), clientController.validate);
// Editar un cliente existente.
router.put('/:id', requirePermission('clients.update'), validate(updateSchema), clientController.update);
// Borrar un cliente.
router.delete('/:id', requirePermission('clients.delete'), clientController.remove);

export default router;
