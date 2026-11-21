// Este archivo recibe las peticiones web de los SUB-PROYECTOS de un cliente (ver
// clientProjectService.js): listarlos, crear uno nuevo o editarlo.
import * as clientProjectService from '../services/clientProjectService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const list = asyncHandler(async (req, res) => {
  res.json(await clientProjectService.list(req.params.id));
});
export const create = asyncHandler(async (req, res) => {
  res.status(201).json(await clientProjectService.create(req.params.id, req.body));
});
export const update = asyncHandler(async (req, res) => {
  res.json(await clientProjectService.update(req.params.projectId, req.body));
});
