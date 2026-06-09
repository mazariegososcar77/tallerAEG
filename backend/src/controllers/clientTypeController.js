import * as clientTypeService from '../services/clientTypeService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const list = asyncHandler(async (_req, res) => res.json(clientTypeService.list()));
export const create = asyncHandler(async (req, res) => res.status(201).json(clientTypeService.create(req.body)));
export const update = asyncHandler(async (req, res) => res.json(clientTypeService.update(req.params.id, req.body)));
export const remove = asyncHandler(async (req, res) => {
  clientTypeService.remove(req.params.id);
  res.status(204).end();
});
