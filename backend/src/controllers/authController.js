import * as authService from '../services/authService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const result = await authService.login(email, password);
  res.json(result); // { token, user }
});

export const me = asyncHandler(async (req, res) => {
  res.json(authService.getMe(req.user.id));
});

export const logout = asyncHandler(async (_req, res) => {
  // JWT es stateless: el cliente descarta el token. Endpoint por completitud.
  res.json({ message: 'Sesion cerrada' });
});
