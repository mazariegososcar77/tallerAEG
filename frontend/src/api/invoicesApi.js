import { client } from './client.js';

export const invoicesApi = {
  list:    ()           => client.get('/invoices').then(r => r.data),
  get:     (id)         => client.get(`/invoices/${id}`).then(r => r.data),
  certify: (id, email)  => client.post(`/invoices/${id}/certify`, { email }).then(r => r.data),
};
