// Este archivo define las direcciones web (rutas) para manejar los NIVELES DE FIDELIZACION
// (el catalogo de niveles de cliente frecuente, con su descuento, beneficios, color e icono): ver, crear, editar y borrar.
import { Router } from 'express';
import { z } from 'zod';
import * as loyaltyTierController from '../controllers/loyaltyTierController.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requirePermission } from '../middleware/rbac.middleware.js';
import { validate } from '../middleware/validate.middleware.js';

const router = Router();

// Para crear un nivel de fidelizacion: el nombre es obligatorio, el descuento debe estar entre 0 y 100,
// el color debe ser un codigo de color valido (#RRGGBB) y el resto es opcional.
const createSchema = z.object({
  name: z.string().min(2, 'El nivel debe tener al menos 2 caracteres'),
  discount: z.coerce.number().min(0, 'El descuento no puede ser negativo').max(100, 'El descuento no puede superar 100%').optional(),
  benefits: z.string().max(1000).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Color invalido (use formato #RRGGBB)').optional(),
  icon: z.string().max(40).optional(),
  is_active: z.boolean().optional(),
});

// Para editar un nivel de fidelizacion: los mismos datos pero opcionales, y debe venir al menos un cambio.
const updateSchema = createSchema
  .partial()
  .refine((d) => Object.keys(d).length > 0, { message: 'No hay cambios para aplicar' });

// A partir de aqui, todas las rutas de este archivo exigen haber iniciado sesion.
router.use(authenticate);

/**
 * @openapi
 * /loyalty-tiers:
 *   get:
 *     tags: [Fidelizacion]
 *     summary: Listar niveles de fidelizacion
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Lista de niveles }
 *   post:
 *     tags: [Fidelizacion]
 *     summary: Crear nivel de fidelizacion
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Nivel creado }
 */
// Ver la lista de niveles de fidelizacion.
router.get('/', requirePermission('loyalty.view'), loyaltyTierController.list);
// Crear un nivel de fidelizacion nuevo.
router.post('/', requirePermission('loyalty.create'), validate(createSchema), loyaltyTierController.create);

/**
 * @openapi
 * /loyalty-tiers/{id}:
 *   put:
 *     tags: [Fidelizacion]
 *     summary: Actualizar nivel de fidelizacion
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     responses:
 *       200: { description: Nivel actualizado }
 *   delete:
 *     tags: [Fidelizacion]
 *     summary: Eliminar nivel de fidelizacion
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     responses:
 *       204: { description: Eliminado }
 *       409: { description: Nivel con clientes asignados }
 */
// Editar un nivel de fidelizacion existente.
router.put('/:id', requirePermission('loyalty.update'), validate(updateSchema), loyaltyTierController.update);
// Borrar un nivel de fidelizacion (no se puede si hay clientes usandolo).
router.delete('/:id', requirePermission('loyalty.delete'), loyaltyTierController.remove);

export default router;
