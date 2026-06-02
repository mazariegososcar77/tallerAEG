import * as articleService from '../services/articleService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';

export const list = asyncHandler(async (_req, res) => res.json(articleService.list()));
export const getById = asyncHandler(async (req, res) => res.json(articleService.getById(req.params.id)));
export const create = asyncHandler(async (req, res) => res.status(201).json(articleService.create(req.body)));
export const update = asyncHandler(async (req, res) => res.json(articleService.update(req.params.id, req.body)));
export const remove = asyncHandler(async (req, res) => {
  articleService.remove(req.params.id);
  res.status(204).end();
});

export const bulkCreate = asyncHandler(async (req, res) => {
  const result = articleService.bulkCreate(req.body.items);
  res.status(201).json(result); // { created, errors }
});

export const uploadImage = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, 'No se recibio ninguna imagen');
  res.status(201).json({ url: `/api/uploads/${req.file.filename}` });
});
