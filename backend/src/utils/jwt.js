/** Firma y verificacion de JSON Web Tokens. */
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export function signToken(payload) {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtExpires });
}

export function verifyToken(token) {
  return jwt.verify(token, env.jwtSecret);
}
