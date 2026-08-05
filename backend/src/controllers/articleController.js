// Este archivo recibe las peticiones web relacionadas a ARTÍCULOS del inventario:
// verlos, crearlos, editarlos, borrarlos, subirlos en lote desde Excel y subir su imagen.
import * as articleService from '../services/articleService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import path from 'path';

// Cuando el usuario abre la pantalla de Inventario, esto trae la lista de artículos
// (se puede filtrar por tipo de artículo).
export const list = asyncHandler(async (req, res) => {
  const typeId = req.query.type_id || null;
  res.json(await articleService.list(typeId));
});
// Cuando el usuario entra al detalle de un artículo, esto trae sus datos completos.
export const getById = asyncHandler(async (req, res) => {
  res.json(await articleService.getById(req.params.id));
});
// Cuando el usuario guarda un artículo nuevo desde el formulario, esto lo recibe y lo manda a guardar.
export const create = asyncHandler(async (req, res) => {
  res.status(201).json(await articleService.create(req.body));
});
// Cuando el usuario edita un artículo existente y guarda los cambios, esto los aplica.
export const update = asyncHandler(async (req, res) => {
  res.json(await articleService.update(req.params.id, req.body));
});
// Cuando el usuario borra un artículo, esto lo elimina.
export const remove = asyncHandler(async (req, res) => {
  await articleService.remove(req.params.id);
  res.status(204).end();
});
// Cuando el usuario sube un Excel con varios artículos de una vez (carga masiva), esto
// intenta guardar cada fila y devuelve cuántos se crearon y cuáles filas tuvieron error.
export const bulkCreate = asyncHandler(async (req, res) => {
  const { items } = req.body;
  const results = { created: 0, errors: [] };
  for (const [i, item] of items.entries()) {
    try {
      await articleService.create(item);
      results.created++;
    } catch (err) {
      results.errors.push({ row: i + 1, error: err.message });
    }
  }
  res.status(201).json(results);
});
// Cuando el usuario sube una foto para un artículo, esto guarda el archivo y devuelve
// la dirección (URL) donde quedó guardada la imagen.
export const uploadImage = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No se recibio imagen' });
  }
  const url = '/uploads/' + req.file.filename;
  res.status(201).json({ url });
});
