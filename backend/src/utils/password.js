/**
 * En palabras simples: este archivo protege las contraseñas de los
 * usuarios. Nunca se guarda la contraseña tal cual la escribe la persona;
 * se guarda una version "revuelta" (hash) que no se puede leer al reves,
 * y luego se compara para confirmar el inicio de sesion.
 *
 * Hash y verificacion de contrasenas con bcryptjs (sin dependencias nativas).
 */
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

// Convierte una contraseña en texto plano en su version "revuelta" (hash),
// que es la que se guarda en la base de datos.
export function hashPassword(plain) {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

// Compara una contraseña escrita por el usuario contra el hash guardado,
// para saber si coinciden (es lo que se usa al iniciar sesion).
export function comparePassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}
