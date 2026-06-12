import * as clientTypeService from '../services/clientTypeService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const list = asyncHandler(async (_req, res) => {
  res.json(await clientTypeService.list());
});
export const getById = asyncHandler(async (req, res) => {
  res.json(await clientTypeService.getById(req.params.id));
});
export const create = asyncHandler(async (req, res) => {
  res.status(201).json(await clientTypeService.create(req.body));
});
export const update = asyncHandler(async (req, res) => {
  res.json(await clientTypeService.update(req.params.id, req.body));
});
export const remove = asyncHandler(async (req, res) => {
  await clientTypeService.remove(req.params.id);
  res.status(204).end();
});
