import { client } from './client.js';

export const rolesApi = {
  list: () => client.get('/roles').then((r) => r.data),
  get: (id) => client.get(`/roles/${id}`).then((r) => r.data),
  create: (payload) => client.post('/roles', payload).then((r) => r.data),
  update: (id, payload) => client.put(`/roles/${id}`, payload).then((r) => r.data),
  setPermissions: (id, permissions) =>
    client.put(`/roles/${id}/permissions`, { permissions }).then((r) => r.data),
  remove: (id) => client.delete(`/roles/${id}`).then((r) => r.data),
};
