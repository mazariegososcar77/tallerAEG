// Este archivo maneja los "mantenimientos programados" de las maquinas (calendario de servicios).
import { client } from './client.js';

// Funciones para consultar y modificar mantenimientos. `list` puede filtrar por cliente.
export const maintenanceApi = {
  list: (clientId) => client.get('/maintenance', { params: clientId ? { client_id: clientId } : {} }).then(r => r.data),
  get: (id) => client.get(`/maintenance/${id}`).then(r => r.data),
  create: (data) => client.post('/maintenance', data).then(r => r.data),
  update: (id, data) => client.put(`/maintenance/${id}`, data).then(r => r.data),
  remove: (id) => client.delete(`/maintenance/${id}`).then(r => r.data),
  // Trae los mantenimientos que se vencen pronto (dentro de la cantidad de dias indicada).
  upcoming: (days) => client.get('/maintenance/upcoming', { params: { days } }).then(r => r.data),
};
