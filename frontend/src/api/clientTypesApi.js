import { client } from './client.js';

export const clientTypesApi = {
  list: () => client.get('/client-types').then((r) => r.data),
  create: (payload) => client.post('/client-types', payload).then((r) => r.data),
  update: (id, payload) => client.put(`/client-types/${id}`, payload).then((r) => r.data),
  remove: (id) => client.delete(`/client-types/${id}`).then((r) => r.data),
};
