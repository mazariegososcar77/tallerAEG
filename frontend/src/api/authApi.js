// Este archivo maneja todo lo relacionado a "iniciar y cerrar sesion" en el sistema.
import { client } from './client.js';

// Funciones para conectarse con el servidor y manejar la sesion del usuario:
// - login: envia el correo y la contraseña, y si son correctos recibe una credencial (token).
// - me: pregunta al servidor "¿quien soy y que permisos tengo?" usando la sesion actual.
// - logout: avisa al servidor que el usuario ya cerro sesion.
export const authApi = {
  login: (email, password) =>
    client.post('/auth/login', { email, password }).then((r) => r.data),
  me: () => client.get('/auth/me').then((r) => r.data),
  logout: () => client.post('/auth/logout').then((r) => r.data),
};
