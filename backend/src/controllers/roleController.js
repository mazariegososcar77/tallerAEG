import * as roleService from '../services/roleService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const list = asyncHandler(async (_req, res) => {
  res.json(await roleService.list());
});
export const getById = asyncHandler(async (req, res) => {
  res.json(await roleService.getById(req.params.id));
});
export const create = asyncHandler(async (req, res) => {
  const role = await roleService.create(req.body);
  res.status(201).json(role);
});
export const update = asyncHandler(async (req, res) => {
  res.json(await roleService.update(req.params.id, req.body));
});
export const setPermissions = asyncHandler(async (req, res) => {
  res.json(await roleService.updatePermissions(req.params.id, req.body.permissions));
});
export const remove = asyncHandler(async (req, res) => {
  await roleService.remove(req.params.id);
  res.status(204).end();
});
