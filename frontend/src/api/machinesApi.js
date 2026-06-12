import { client } from './client.js';
export const machinesApi = {
  list: (clientId) => client.get('/machines', { params: clientId ? { client_id: clientId } : {} }).then(r => r.data),
  get: (id) => client.get(`/machines/${id}`).then(r => r.data),
  create: (data) => client.post('/machines', data).then(r => r.data),
  update: (id, data) => client.put(`/machines/${id}`, data).then(r => r.data),
  remove: (id) => client.delete(`/machines/${id}`).then(r => r.data),
};
