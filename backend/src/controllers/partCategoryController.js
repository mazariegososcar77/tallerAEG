// Este archivo recibe las peticiones web relacionadas a las CATEGORÍAS DE PIEZA (catálogo
// configurable que se usa en cotizaciones y en el alta rápida de repuestos): verlas, crearlas, editarlas, borrarlas.
import * as partCategoryService from '../services/partCategoryService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// Cuando el usuario abre la pantalla de Configuración > categorías de pieza, esto trae la lista completa.
export const list = asyncHandler(async (_req, res) => {
  res.json(await partCategoryService.list());
});

// Trae los datos de una categoría de pieza en particular.
export const getById = asyncHandler(async (req, res) => {
  res.json(await partCategoryService.getById(req.params.id));
});

// Calcula cuál sería el siguiente código disponible para una categoría (según su prefijo),
// para sugerirlo automáticamente en el formulario.
export const nextCode = asyncHandler(async (req, res) => {
  const { prefix } = req.params;
  res.json({ code: await partCategoryService.getNextCode(prefix) });
});

// Cuando el usuario crea una categoría de pieza nueva desde el formulario, esto la guarda.
export const create = asyncHandler(async (req, res) => {
  res.status(201).json(await partCategoryService.create(req.body));
});

// Cuando el usuario edita una categoría de pieza y guarda los cambios, esto los aplica.
export const update = asyncHandler(async (req, res) => {
  res.json(await partCategoryService.update(req.params.id, req.body));
});

// Cuando el usuario borra una categoría de pieza, esto la elimina.
export const remove = asyncHandler(async (req, res) => {
  await partCategoryService.remove(req.params.id);
  res.status(204).end();
});
