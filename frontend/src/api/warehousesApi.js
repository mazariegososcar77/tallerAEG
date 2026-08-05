// Este archivo maneja las "bodegas" donde se guarda el inventario (catalogo configurable en Configuracion).
import { client } from './client.js';

// Funciones basicas para listar, crear, editar y eliminar bodegas.
export const warehousesApi = {
  list: () => client.get('/warehouses').then((r) => r.data),
  create: (payload) => client.post('/warehouses', payload).then((r) => r.data),
  update: (id, payload) => client.put(`/warehouses/${id}`, payload).then((r) => r.data),
  remove: (id) => client.delete(`/warehouses/${id}`).then((r) => r.data),
};
