// Este archivo define las direcciones web (rutas) para manejar los CLIENTES del taller:
// ver la lista, ver el detalle, crear (normal o rapido), editar, validar y borrar.
import { Router } from 'express';
import { z } from 'zod';
import { booleanFlag } from '../utils/zodHelpers.js';
import { isValidNit, isValidDpi, isValidPhone, MENSAJES } from '../utils/guatemala.js';
import * as clientController from '../controllers/clientController.js';
import * as clientProjectController from '../controllers/clientProjectController.js';
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

// Datos que se piden para crear o editar un cliente: el nombre es obligatorio. El telefono y que
// exista NIT o DPI se revisan aparte en el servicio -- create() (alta normal) los exige, pero
// quickCreate() (alta rapida desde el selector de Ordenes/Cotizaciones) no, para que un Tecnico en
// campo pueda dejar un cliente "temporal" solo con el nombre, pendiente de que un administrador lo
// complete despues. "contacts", si viene, REEMPLAZA por completo la lista de contactos del cliente
// (no es un patch fila por fila).
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
  phone:         z.string().trim().max(40).refine((v) => v === '' || isValidPhone(v), MENSAJES.phone).optional(),
  // A diferencia de "phone", nunca es obligatorio en ninguna categoria.
  office_phone:  z.string().trim().max(40).refine((v) => v === '' || isValidPhone(v), MENSAJES.phone).optional(),
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

// Un sub-proyecto de un cliente (ver clientProjectService.js): solo nombre + ubicacion.
const projectSchema = z.object({
  name:     z.string().trim().min(1, 'El nombre del proyecto es obligatorio.').max(255),
  location: z.string().trim().max(255).optional().or(z.literal('')),
});
const projectUpdateSchema = z.object({
  name:      z.string().trim().min(1, 'El nombre del proyecto es obligatorio.').max(255).optional(),
  location:  z.string().trim().max(255).optional().or(z.literal('')),
  is_active: booleanFlag.optional(),
}).refine(d => Object.keys(d).length > 0, { message: 'No hay cambios para aplicar' });

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
// visitas de servicio de cada una, mas el total facturado historicamente (esto ultimo
// solo si ademas tiene "billing.view" -- ver clientService.getHistory). Acepta el permiso
// completo de Clientes O el permiso acotado "clients.history.view" (rol Tecnico: puede ver
// el historial de un cliente puntual sin ver la lista completa de todos los clientes).
router.get('/:id/history', requirePermission(['clients.view', 'clients.history.view']), clientController.getHistory);
// Sub-proyectos del cliente (ver clientProjectService.js): mismo permiso que ya exige
// poder elegir ese cliente en un selector (Maquinas/Ordenes de Trabajo/Cotizaciones ya
// cargan la lista completa con "clients.view", asi que quien llega a usar el selector de
// proyecto ya lo tiene).
router.get('/:id/projects', requirePermission('clients.view'), clientProjectController.list);
router.post('/:id/projects', requirePermission('clients.view'), validate(projectSchema), clientProjectController.create);
router.put('/:id/projects/:projectId', requirePermission('clients.view'), validate(projectUpdateSchema), clientProjectController.update);
// Marca un cliente como validado (revision del administrador).
router.patch('/:id/validate', requirePermission('clients.validate'), clientController.validate);
// Editar un cliente existente.
router.put('/:id', requirePermission('clients.update'), validate(updateSchema), clientController.update);
// Borrar un cliente.
router.delete('/:id', requirePermission('clients.delete'), clientController.remove);

export default router;
