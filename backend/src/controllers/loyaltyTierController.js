import * as loyaltyTierService from '../services/loyaltyTierService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const list = asyncHandler(async (_req, res) => {
  res.json(await loyaltyTierService.list());
});
export const getById = asyncHandler(async (req, res) => {
  res.json(await loyaltyTierService.getById(req.params.id));
});
export const create = asyncHandler(async (req, res) => {
  res.status(201).json(await loyaltyTierService.create(req.body));
});
export const update = asyncHandler(async (req, res) => {
  res.json(await loyaltyTierService.update(req.params.id, req.body));
});
export const remove = asyncHandler(async (req, res) => {
  await loyaltyTierService.remove(req.params.id);
  res.status(204).end();
});
