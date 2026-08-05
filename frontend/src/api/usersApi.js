// Este archivo maneja las cuentas de usuario del sistema (quien puede iniciar sesion).
import { client } from './client.js';

// Funciones basicas para listar, crear, editar y eliminar usuarios.
export const usersApi = {
  list: () => client.get('/users').then((r) => r.data),
  get: (id) => client.get(`/users/${id}`).then((r) => r.data),
  create: (payload) => client.post('/users', payload).then((r) => r.data),
  update: (id, payload) => client.put(`/users/${id}`, payload).then((r) => r.data),
  remove: (id) => client.delete(`/users/${id}`).then((r) => r.data),
};
