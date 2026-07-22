// Este archivo maneja los "articulos" del inventario (piezas, repuestos, etc.).
import { client } from './client.js';

// Funciones para consultar y modificar articulos del inventario:
export const articlesApi = {
  list: () => client.get('/articles').then((r) => r.data), // trae todos los articulos
  listByType: (typeId) => client.get(`/articles?type_id=${typeId}`).then((r) => r.data), // trae solo los de un tipo
  get: (id) => client.get(`/articles/${id}`).then((r) => r.data), // trae un articulo por su id
  create: (payload) => client.post('/articles', payload).then((r) => r.data), // crea un articulo nuevo
  update: (id, payload) => client.put(`/articles/${id}`, payload).then((r) => r.data), // edita un articulo existente
  remove: (id) => client.delete(`/articles/${id}`).then((r) => r.data), // elimina un articulo
  bulkCreate: (items) => client.post('/articles/bulk', { items }).then((r) => r.data), // crea muchos articulos de una vez (carga masiva por Excel)
  // Sube la foto de un articulo al servidor y devuelve la direccion (url) donde quedo guardada.
  uploadImage: (file) => {
    const form = new FormData();
    form.append('image', file);
    return client.post('/articles/upload-image', form).then((r) => r.data); // { url }
  },
};
