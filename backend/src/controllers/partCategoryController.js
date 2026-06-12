import * as partCategoryService from '../services/partCategoryService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const list = asyncHandler(async (_req, res) => {
  res.json(await partCategoryService.list());
});

export const getById = asyncHandler(async (req, res) => {
  res.json(await partCategoryService.getById(req.params.id));
});

export const nextCode = asyncHandler(async (req, res) => {
  const { prefix } = req.params;
  res.json({ code: await partCategoryService.getNextCode(prefix) });
});

export const create = asyncHandler(async (req, res) => {
  res.status(201).json(await partCategoryService.create(req.body));
});

export const update = asyncHandler(async (req, res) => {
  res.json(await partCategoryService.update(req.params.id, req.body));
});

export const remove = asyncHandler(async (req, res) => {
  await partCategoryService.remove(req.params.id);
  res.status(204).end();
});
