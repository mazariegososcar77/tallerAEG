import { client } from './client.js';

export const workReportsApi = {
  list:         ()         => client.get('/work-reports').then(r => r.data),
  get:          (id)       => client.get(`/work-reports/${id}`).then(r => r.data),
  createForOrder: (workOrderId) => client.post('/work-reports', { work_order_id: workOrderId }).then(r => r.data),
  update:       (id, payload) => client.put(`/work-reports/${id}`, payload).then(r => r.data),
  finalize:     (id)       => client.post(`/work-reports/${id}/finalize`).then(r => r.data),
  remove:       (id)       => client.delete(`/work-reports/${id}`).then(r => r.data),
  addPhoto: (id, file, { stage, caption }) => {
    const form = new FormData();
    form.append('photo', file);
    form.append('stage', stage);
    if (caption) form.append('caption', caption);
    return client.post(`/work-reports/${id}/photos`, form).then(r => r.data);
  },
  removePhoto: (id, photoId) => client.delete(`/work-reports/${id}/photos/${photoId}`).then(r => r.data),
  setSignature: (id, file, role, name) => {
    const form = new FormData();
    form.append('photo', file);
    form.append('role', role);
    form.append('name', name);
    return client.post(`/work-reports/${id}/signature`, form).then(r => r.data);
  },
};
