import * as articleService from '../services/articleService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import path from 'path';

export const list = asyncHandler(async (req, res) => {
  const typeId = req.query.type_id || null;
  res.json(await articleService.list(typeId));
});
export const getById = asyncHandler(async (req, res) => {
  res.json(await articleService.getById(req.params.id));
});
export const create = asyncHandler(async (req, res) => {
  res.status(201).json(await articleService.create(req.body));
});
export const update = asyncHandler(async (req, res) => {
  res.json(await articleService.update(req.params.id, req.body));
});
export const remove = asyncHandler(async (req, res) => {
  await articleService.remove(req.params.id);
  res.status(204).end();
});
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
export const uploadImage = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No se recibio imagen' });
  }
  const url = '/uploads/' + req.file.filename;
  res.status(201).json({ url });
});
