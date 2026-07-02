import { client } from './client.js';

export const clientsApi = {
  list: () => client.get('/clients').then((r) => r.data),
  get: (id) => client.get(`/clients/${id}`).then((r) => r.data),
  create: (payload) => client.post('/clients', payload).then((r) => r.data),
  // Alta rapida desde ordenes/cotizaciones: crea el cliente sin validar.
  quickCreate: (payload) => client.post('/clients/quick', payload).then((r) => r.data),
  update: (id, payload) => client.put(`/clients/${id}`, payload).then((r) => r.data),
  // Marca un cliente como validado (revision del administrador).
  validate: (id) => client.patch(`/clients/${id}/validate`).then((r) => r.data),
  remove: (id) => client.delete(`/clients/${id}`).then((r) => r.data),
};
