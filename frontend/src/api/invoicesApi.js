// Este archivo maneja las "facturas" que se generan al finalizar un reporte de trabajo.
import { client } from './client.js';

export const invoicesApi = {
  list:    ()           => client.get('/invoices').then(r => r.data),
  get:     (id)         => client.get(`/invoices/${id}`).then(r => r.data),
  // Marca la factura como certificada y envia el correo indicado (la certificacion fiscal real aun no esta integrada, ver felCertifier.js del backend).
  certify: (id, email)  => client.post(`/invoices/${id}/certify`, { email }).then(r => r.data),
};
