// Este archivo maneja las "categorias de pieza" usadas al armar cotizaciones (catalogo configurable en Configuracion).
import { client } from './client.js';

export const partCategoriesApi = {
  list:     ()         => client.get('/part-categories').then(r => r.data),
  // Pide al servidor el siguiente codigo disponible para una categoria con ese prefijo (numeracion automatica).
  nextCode: (prefix)   => client.get(`/part-categories/next-code/${prefix}`).then(r => r.data.code),
  create:   (payload)  => client.post('/part-categories', payload).then(r => r.data),
  update:   (id, data) => client.put(`/part-categories/${id}`, data).then(r => r.data),
  remove:   (id)       => client.delete(`/part-categories/${id}`).then(r => r.data),
};
