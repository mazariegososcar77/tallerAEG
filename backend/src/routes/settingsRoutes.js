// Este archivo define las direcciones web (rutas) de la CONFIGURACION GENERAL
// del sistema (pantalla Configuracion > Configuracion general): leerla y guardarla.
//
// Nota de permisos: LEER la configuracion solo exige tener sesion, sin permiso
// especial, porque el tema y los colores de marca se le aplican a todos los
// usuarios (si esto exigiera un permiso, un rol sin el veria la app descolorida).
// GUARDAR si exige `settings.update`, que en el seed solo tiene Administrador.
import { Router } from 'express';
import { z } from 'zod';
import * as settingsController from '../controllers/settingsController.js';
import { SETTING_KEYS } from '../services/settingsService.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requirePermission } from '../middleware/rbac.middleware.js';
import { validate } from '../middleware/validate.middleware.js';

const router = Router();

// El body es un objeto con cualquier subconjunto de los ajustes conocidos (solo
// se guarda lo que venga). Aqui se revisa la forma; el rango y formato exacto de
// cada ajuste lo valida settingsService (que es donde vive su definicion).
const updateSchema = z
  .object(Object.fromEntries(
    SETTING_KEYS.map((key) => [key, z.union([z.string(), z.number()]).optional()]),
  ))
  .strict()
  .refine((d) => Object.keys(d).length > 0, { message: 'No hay cambios para aplicar' });

// A partir de aqui, todas las rutas de este archivo exigen haber iniciado sesion.
router.use(authenticate);

/**
 * @openapi
 * /settings:
 *   get:
 *     tags: [Configuracion]
 *     summary: Leer la configuracion general del sistema
 *     description: >
 *       Devuelve todos los ajustes (colores de marca, tema por defecto, datos del
 *       taller, vigencia de cotizaciones). Las claves que no esten guardadas se
 *       devuelven con su valor por defecto. Solo requiere sesion, sin permiso.
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Configuracion completa }
 *   put:
 *     tags: [Configuracion]
 *     summary: Guardar cambios en la configuracion general
 *     description: Guarda solo los ajustes enviados. Requiere el permiso settings.update.
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Configuracion ya actualizada }
 *       400: { description: Ajuste desconocido o valor invalido }
 *       403: { description: Sin permiso settings.update }
 */
router.get('/', settingsController.get);
router.put('/', requirePermission('settings.update'), validate(updateSchema), settingsController.update);

export default router;
