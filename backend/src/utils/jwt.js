/**
 * En palabras simples: este archivo crea y revisa el "carnet digital"
 * (token) que recibe un usuario al iniciar sesion, y que despues usa para
 * demostrar quien es en cada peticion sin tener que escribir su contraseña
 * otra vez.
 *
 * Firma y verificacion de JSON Web Tokens.
 */
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

// Crea un nuevo "carnet digital" (token) firmado con los datos del usuario
// (payload) que se le pasan; ese carnet expira despues de un tiempo
// (env.jwtExpires, por defecto 8 horas).
export function signToken(payload) {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtExpires });
}

// Revisa que un "carnet digital" (token) sea autentico y no haya expirado;
// si es valido, devuelve los datos que tiene guardados adentro.
export function verifyToken(token) {
  return jwt.verify(token, env.jwtSecret);
}
