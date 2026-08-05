/**
 * Diagnostico de conexion con Digifact: solo pide un token con las
 * credenciales de .env y confirma que la autenticacion funciona. No
 * certifica ni anula nada.
 *
 * Uso: node scripts/test_digifact_token.mjs
 */
import { getToken } from '../src/lib/digifactClient.js';
import { env } from '../src/config/env.js';

try {
  const token = await getToken();
  console.log(`Conexion OK con Digifact (ambiente: ${env.digifact.environment}).`);
  console.log(`Token recibido: ${token.slice(0, 16)}...(${token.length} caracteres)`);
  process.exit(0);
} catch (err) {
  console.error('Fallo la autenticacion contra Digifact:', err.message);
  if (err.details) console.error('Detalle:', JSON.stringify(err.details, null, 2));
  process.exit(1);
}
