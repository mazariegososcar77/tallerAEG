import * as clientService from '../services/clientService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const list = asyncHandler(async (_req, res) => {
  res.json(await clientService.list());
});
export const getById = asyncHandler(async (req, res) => {
  res.json(await clientService.getById(req.params.id));
});
export const create = asyncHandler(async (req, res) => {
  res.status(201).json(await clientService.create(req.body));
});
export const update = asyncHandler(async (req, res) => {
  res.json(await clientService.update(req.params.id, req.body));
});
export const remove = asyncHandler(async (req, res) => {
  await clientService.remove(req.params.id);
  res.status(204).end();
});
