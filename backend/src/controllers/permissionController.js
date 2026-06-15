import * as permissionService from '../services/permissionService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const list = asyncHandler(async (_req, res) => {
  res.json(await permissionService.list());
});
