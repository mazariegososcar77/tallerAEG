// Este archivo recibe las peticiones web relacionadas a INICIAR/CERRAR SESIÓN y a saber
// quién es el usuario que está conectado en este momento.
import * as authService from '../services/authService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// Cuando el usuario escribe su correo y contraseña en la pantalla de login, esto los valida
// y, si son correctos, le da acceso al sistema.
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const result = await authService.login(email, password);
  res.json(result);
});

// Devuelve los datos del usuario que tiene la sesión abierta (para mostrar su nombre, permisos, etc.).
export const me = asyncHandler(async (req, res) => {
  res.json(await authService.getMe(req.user.id));
});

// Cuando el usuario cierra sesión, esto confirma que la sesión terminó.
export const logout = asyncHandler(async (_req, res) => {
  res.json({ message: 'Sesion cerrada' });
});
