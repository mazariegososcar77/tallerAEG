/**
 * Instancia Axios compartida. Toda llamada HTTP pasa por aqui.
 * - Request: adjunta el token Bearer si existe.
 * - Response: ante un 401 con sesion previa, cierra sesion y va a /login;
 *   normaliza el error a un Error con .message (texto del backend) y .details.
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

    const normalized = new Error(
      error.response?.data?.error || error.message || 'Error de conexion con el servidor',
    );
    normalized.status = status;
    normalized.details = error.response?.data?.details;
    return Promise.reject(normalized);
  },
);
