/**
 * Guarda la sesión del usuario en el navegador (localStorage), para que al
 * recargar la página o volver a entrar la app "recuerde" quién inició sesión,
 * sin tener que escribir la contraseña otra vez. Guarda dos cosas: el "token"
 * (una clave secreta que el servidor entrega al iniciar sesión y que sirve
 * como comprobante de identidad en cada pedido de datos) y los datos del
 * usuario (nombre, rol, permisos, etc.).
 */
const TOKEN_KEY = 'taller_aeg_token';
const USER_KEY = 'taller_aeg_user';

/** Devuelve el token guardado, o null si no hay sesión iniciada. */
export const getToken = () => localStorage.getItem(TOKEN_KEY);
/** Guarda el token recibido al iniciar sesión. */
export const setToken = (token) => localStorage.setItem(TOKEN_KEY, token);

/** Devuelve los datos del usuario guardados (o null si no hay o están dañados). */
export const getStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY));
  } catch {
    return null;
  }
};
/** Guarda los datos del usuario que inició sesión. */
export const setStoredUser = (user) => localStorage.setItem(USER_KEY, JSON.stringify(user));

/** Borra el token y los datos del usuario: esto es lo que hace "Cerrar sesión". */
export const clearAuth = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};
