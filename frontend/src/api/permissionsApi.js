// Este archivo maneja el listado de "permisos" del sistema (los que se pueden asignar a un rol de usuario).
import { client } from './client.js';

export const permissionsApi = {
  list: () => client.get('/permissions').then((r) => r.data), // trae todos los permisos existentes
};
