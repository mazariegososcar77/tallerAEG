// Este archivo maneja el catalogo de "tipos de articulo" (categorias del inventario, configurables en Configuracion).
import { client } from './client.js';

// Funciones basicas para listar, crear, editar y eliminar tipos de articulo.
export const articleTypesApi = {
  list: () => client.get('/article-types').then((r) => r.data),
  create: (payload) => client.post('/article-types', payload).then((r) => r.data),
  update: (id, payload) => client.put(`/article-types/${id}`, payload).then((r) => r.data),
  remove: (id) => client.delete(`/article-types/${id}`).then((r) => r.data),
};
