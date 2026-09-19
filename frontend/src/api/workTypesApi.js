// Este archivo maneja el catalogo de "tipos de trabajo" (el que alimenta el selector de
// Cotizaciones y Ordenes de Trabajo, configurable en Configuracion).
import { client } from './client.js';

// Funciones basicas para listar, crear, editar y eliminar tipos de trabajo.
export const workTypesApi = {
  list: () => client.get('/work-types').then((r) => r.data),
  create: (payload) => client.post('/work-types', payload).then((r) => r.data),
  update: (id, payload) => client.put(`/work-types/${id}`, payload).then((r) => r.data),
  remove: (id) => client.delete(`/work-types/${id}`).then((r) => r.data),
};
