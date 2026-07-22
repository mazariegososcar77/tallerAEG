/**
 * En palabras simples: este archivo junta en un solo lugar la
 * configuracion secreta/ajustable del servidor (por ejemplo en que puerto
 * arranca, o la clave usada para generar el "carnet digital" de sesion),
 * que normalmente se define en un archivo .env y no se sube al repositorio.
 *
 * Carga y centraliza las variables de entorno.
 */
import dotenv from 'dotenv';

dotenv.config();

export const env = {
  port: Number(process.env.PORT) || 4000,
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  jwtSecret: process.env.JWT_SECRET || 'dev-insecure-secret-change-me',
  jwtExpires: process.env.JWT_EXPIRES || '8h',
};

if (env.jwtSecret === 'dev-insecure-secret-change-me') {
  console.warn('[env] JWT_SECRET no definido: usando un secreto inseguro de desarrollo.');
}
