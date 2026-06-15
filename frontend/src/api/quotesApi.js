import { client } from './client.js';
export const quotesApi = {
  list:         ()            => client.get('/quotes').then(r => r.data),
  get:          (id)          => client.get(`/quotes/${id}`).then(r => r.data),
  create:       (payload)     => client.post('/quotes', payload).then(r => r.data),
  update:       (id, payload) => client.put(`/quotes/${id}`, payload).then(r => r.data),
  updateStatus: (id, status)  => client.patch(`/quotes/${id}/status`, { status }).then(r => r.data),
  remove:       (id)          => client.delete(`/quotes/${id}`).then(r => r.data),
};
