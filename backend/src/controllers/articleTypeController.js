import * as articleTypeService from '../services/articleTypeService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const list = asyncHandler(async (_req, res) => {
  res.json(await articleTypeService.list());
});
export const getById = asyncHandler(async (req, res) => {
  res.json(await articleTypeService.getById(req.params.id));
});
export const create = asyncHandler(async (req, res) => {
  res.status(201).json(await articleTypeService.create(req.body));
});
export const update = asyncHandler(async (req, res) => {
  res.json(await articleTypeService.update(req.params.id, req.body));
});
export const remove = asyncHandler(async (req, res) => {
  await articleTypeService.remove(req.params.id);
  res.status(204).end();
});
