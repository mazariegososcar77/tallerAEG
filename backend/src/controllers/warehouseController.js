import * as warehouseService from '../services/warehouseService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const list = asyncHandler(async (_req, res) => {
  res.json(await warehouseService.list());
});
export const getById = asyncHandler(async (req, res) => {
  res.json(await warehouseService.getById(req.params.id));
});
export const create = asyncHandler(async (req, res) => {
  res.status(201).json(await warehouseService.create(req.body));
});
export const update = asyncHandler(async (req, res) => {
  res.json(await warehouseService.update(req.params.id, req.body));
});
export const remove = asyncHandler(async (req, res) => {
  await warehouseService.remove(req.params.id);
  res.status(204).end();
});
