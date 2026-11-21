// Este archivo maneja los "sub-proyectos" de un cliente: la forma de distinguir, bajo un
// mismo cliente (un NIT), varios proyectos/sucursales (ej. "Burger King Amatitlan") sin
// tener que crear un cliente nuevo por cada uno.
import { client } from './client.js';

export const clientProjectsApi = {
  list:   (clientId)          => client.get(`/clients/${clientId}/projects`).then(r => r.data),
  create: (clientId, data)    => client.post(`/clients/${clientId}/projects`, data).then(r => r.data),
  update: (clientId, id, data) => client.put(`/clients/${clientId}/projects/${id}`, data).then(r => r.data),
};
