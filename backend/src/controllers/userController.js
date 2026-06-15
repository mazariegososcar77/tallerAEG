import * as userService from '../services/userService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const list = asyncHandler(async (_req, res) => {
  res.json(await userService.list());
});

export const getById = asyncHandler(async (req, res) => {
  res.json(await userService.getById(req.params.id));
});

export const create = asyncHandler(async (req, res) => {
  const user = await userService.create(req.body);
  res.status(201).json(user);
});

export const update = asyncHandler(async (req, res) => {
  const user = await userService.update(req.params.id, req.body);
  res.json(user);
});

export const remove = asyncHandler(async (req, res) => {
  await userService.remove(req.params.id, req.user.id);
  res.status(204).end();
});
