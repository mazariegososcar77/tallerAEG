import { client } from './client.js';

export const articleTypesApi = {
  list: () => client.get('/article-types').then((r) => r.data),
  create: (payload) => client.post('/article-types', payload).then((r) => r.data),
  update: (id, payload) => client.put(`/article-types/${id}`, payload).then((r) => r.data),
  remove: (id) => client.delete(`/article-types/${id}`).then((r) => r.data),
};
