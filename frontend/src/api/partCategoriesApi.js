import { client } from './client.js';
export const partCategoriesApi = {
  list:     ()         => client.get('/part-categories').then(r => r.data),
  nextCode: (prefix)   => client.get(`/part-categories/next-code/${prefix}`).then(r => r.data.code),
  create:   (payload)  => client.post('/part-categories', payload).then(r => r.data),
  update:   (id, data) => client.put(`/part-categories/${id}`, data).then(r => r.data),
  remove:   (id)       => client.delete(`/part-categories/${id}`).then(r => r.data),
};
