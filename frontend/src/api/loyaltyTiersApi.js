import { client } from './client.js';

export const loyaltyTiersApi = {
  list: () => client.get('/loyalty-tiers').then((r) => r.data),
  create: (payload) => client.post('/loyalty-tiers', payload).then((r) => r.data),
  update: (id, payload) => client.put(`/loyalty-tiers/${id}`, payload).then((r) => r.data),
  remove: (id) => client.delete(`/loyalty-tiers/${id}`).then((r) => r.data),
};
