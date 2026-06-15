import { client } from './client.js';

export const permissionsApi = {
  list: () => client.get('/permissions').then((r) => r.data),
};
