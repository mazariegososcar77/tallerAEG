import { client } from './client.js';

export const articlesApi = {
  list: () => client.get('/articles').then((r) => r.data),
  listByType: (typeId) => client.get(`/articles?type_id=${typeId}`).then((r) => r.data),
  get: (id) => client.get(`/articles/${id}`).then((r) => r.data),
  create: (payload) => client.post('/articles', payload).then((r) => r.data),
  update: (id, payload) => client.put(`/articles/${id}`, payload).then((r) => r.data),
  remove: (id) => client.delete(`/articles/${id}`).then((r) => r.data),
  bulkCreate: (items) => client.post('/articles/bulk', { items }).then((r) => r.data),
  uploadImage: (file) => {
    const form = new FormData();
    form.append('image', file);
    return client.post('/articles/upload-image', form).then((r) => r.data); // { url }
  },
};
