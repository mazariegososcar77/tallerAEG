import { client } from './client.js';

export const warehousesApi = {
  list: () => client.get('/warehouses').then((r) => r.data),
  create: (payload) => client.post('/warehouses', payload).then((r) => r.data),
  update: (id, payload) => client.put(`/warehouses/${id}`, payload).then((r) => r.data),
  remove: (id) => client.delete(`/warehouses/${id}`).then((r) => r.data),
};
