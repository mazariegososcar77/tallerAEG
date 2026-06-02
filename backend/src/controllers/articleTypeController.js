import * as articleTypeService from '../services/articleTypeService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const list = asyncHandler(async (_req, res) => res.json(articleTypeService.list()));
export const create = asyncHandler(async (req, res) => res.status(201).json(articleTypeService.create(req.body)));
export const update = asyncHandler(async (req, res) => res.json(articleTypeService.update(req.params.id, req.body)));
export const remove = asyncHandler(async (req, res) => {
  articleTypeService.remove(req.params.id);
  res.status(204).end();
});
