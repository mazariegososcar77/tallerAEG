/**
 * Instancia Axios compartida. Toda llamada HTTP pasa por aqui.
 * - Request: adjunta el token Bearer si existe.
 * - Response: ante un 401 con sesion previa, cierra sesion y va a /login;
 *   normaliza el error a un Error con .message (texto del backend) y .details.
 *
 * En palabras simples: este archivo es la "linea telefonica" unica entre la
 * pantalla (frontend) y el servidor (backend). Todos los demas archivos de
 * esta carpeta "api/" usan este telefono para pedir o enviar datos. Aqui se
 * hacen dos cosas automaticamente en cada llamada:
 *   1) Se adjunta la "credencial" (token) de quien inicio sesion, para que el
 *      servidor sepa quien esta pidiendo la informacion.
 *   2) Si el servidor responde que la sesion ya no es valida (por ejemplo,
 *      expiro), se cierra la sesion sola y se manda al usuario a la pantalla
 *      de inicio de sesion. Tambien se traducen los errores tecnicos a
 *      mensajes en español faciles de entender.
 */
import axios from 'axios';
import { getToken, clearAuth } from '../lib/authStorage.js';

export const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
});

client.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

client.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;

    // Sesion expirada/invalida: limpiar y redirigir (solo si habia token).
    if (status === 401 && getToken()) {
      clearAuth();
      if (window.location.pathname !== '/login') {
        window.location.assign('/login');
      }
    }

    // Mensaje siempre en español: el del backend si existe. Si no hubo respuesta
    // (red caída, servidor apagado) se evita el texto en inglés de axios. Y si SI
    // hubo respuesta pero sin el formato {error} esperado, es porque no fue el
    // backend quien contesto sino nginx (archivo demasiado grande, backend caido
    // o sin responder) -- se agrega el codigo HTTP al mensaje para no quedar a
    // ciegas la proxima vez que pase (ver backend/CLAUDE.md, "Mensajes de error").
    const sinFormatoEsperado = {
      413: 'El archivo es demasiado grande.',
      502: 'El servidor no respondió (puede haberse quedado sin memoria procesando el archivo).',
      503: 'El servidor no está disponible en este momento.',
      504: 'El servidor tardó demasiado en responder.',
    };
    const normalized = new Error(
      error.response?.data?.error
        || (error.response
          ? `${sinFormatoEsperado[status] || 'Ocurrió un error inesperado.'} Inténtalo de nuevo. (código ${status})`
          : 'No se pudo conectar con el servidor. Verifica tu conexión e inténtalo de nuevo.'),
    );
    normalized.status = status;
    normalized.details = error.response?.data?.details;
    return Promise.reject(normalized);
  },
);
