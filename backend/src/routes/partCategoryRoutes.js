// Este archivo define las direcciones web (rutas) para manejar las CATEGORIAS DE PIEZA
// (el catalogo usado al armar cotizaciones/repuestos, cada una con un prefijo para generar codigos):
// ver, obtener el siguiente codigo disponible, crear, editar y borrar.
import { Router } from 'express';
import * as partCategoryController from '../controllers/partCategoryController.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requirePermission } from '../middleware/rbac.middleware.js';

const router = Router();
// A partir de aqui, todas las rutas de este archivo exigen haber iniciado sesion.
router.use(authenticate);

// Ver la lista de categorias de pieza.
router.get('/',                    requirePermission('part-categories.view'),   partCategoryController.list);
// Averiguar cual seria el siguiente codigo disponible para una categoria (segun su prefijo).
router.get('/next-code/:prefix',   requirePermission('dashboard.view'),         partCategoryController.nextCode);
// Ver el detalle de una categoria especifica.
router.get('/:id',                 requirePermission('part-categories.view'),   partCategoryController.getById);
// Crear una categoria de pieza nueva.
router.post('/',                   requirePermission('part-categories.create'), partCategoryController.create);
// Editar una categoria de pieza existente.
router.put('/:id',                 requirePermission('part-categories.update'), partCategoryController.update);
// Borrar una categoria de pieza.
router.delete('/:id',              requirePermission('part-categories.delete'), partCategoryController.remove);

export default router;
