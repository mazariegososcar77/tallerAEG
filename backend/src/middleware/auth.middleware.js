/**
 * Verifica el JWT del header Authorization y adjunta req.user.
 * Los permisos se consultan en la base de datos en cada peticion (no se
 * confia en la copia que trae el token) para que un cambio de permisos de
 * un rol, o desactivar un usuario, tenga efecto inmediato sin esperar a que
 * ese usuario vuelva a iniciar sesion.
 */
import { verifyToken } from '../utils/jwt.js';
import { ApiError } from '../utils/ApiError.js';
import * as userRepository from '../repositories/userRepository.js';
import * as permissionRepository from '../repositories/permissionRepository.js';

export async function authenticate(req, _res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return next(new ApiError(401, 'No autenticado'));
  }

  let payload;
  try {
    payload = verifyToken(token);
  } catch {
    return next(new ApiError(401, 'Token invalido o expirado'));
  }

  try {
    const user = await userRepository.findById(payload.sub);
    if (!user || !user.is_active) {
      return next(new ApiError(401, 'Sesion invalida'));
    }
    const permissions = await permissionRepository.findByRoleId(user.role_id);
    req.user = {
      id: user.id,
      roleId: user.role_id,
      permissions: permissions.map((p) => p.code),
    };
    next();
  } catch (err) {
    next(err);
  }
}
