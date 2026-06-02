/** Verifica el JWT del header Authorization y adjunta req.user. */
import { verifyToken } from '../utils/jwt.js';
import { ApiError } from '../utils/ApiError.js';

export function authenticate(req, _res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return next(new ApiError(401, 'No autenticado'));
  }

  try {
    const payload = verifyToken(token);
    req.user = {
      id: payload.sub,
      roleId: payload.roleId,
      permissions: payload.permissions || [],
    };
    next();
  } catch {
    next(new ApiError(401, 'Token invalido o expirado'));
  }
}
