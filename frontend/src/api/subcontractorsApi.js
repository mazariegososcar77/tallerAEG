// Este archivo maneja los "subcontratistas" (terceros externos a los que el taller les
// manda trabajos afuera, ej. torneado). Catalogo configurable en Configuracion.
import { client } from './client.js';

export const subcontractorsApi = {
  list: () => client.get('/subcontractors').then((r) => r.data),
  create: (payload) => client.post('/subcontractors', payload).then((r) => r.data),
  update: (id, payload) => client.put(`/subcontractors/${id}`, payload).then((r) => r.data),
  remove: (id) => client.delete(`/subcontractors/${id}`).then((r) => r.data),
};
