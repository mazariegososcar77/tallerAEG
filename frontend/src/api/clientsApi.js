// Este archivo maneja los clientes del taller (sus datos de contacto, NIT/DPI, tipo, fidelizacion, etc.).
import { client } from './client.js';

// Funciones para consultar y modificar clientes:
export const clientsApi = {
  list: () => client.get('/clients').then((r) => r.data), // trae todos los clientes
  get: (id) => client.get(`/clients/${id}`).then((r) => r.data), // trae un cliente por su id
  create: (payload) => client.post('/clients', payload).then((r) => r.data), // crea un cliente nuevo
  // Alta rapida desde ordenes/cotizaciones: crea el cliente sin validar.
  quickCreate: (payload) => client.post('/clients/quick', payload).then((r) => r.data),
  update: (id, payload) => client.put(`/clients/${id}`, payload).then((r) => r.data), // edita un cliente existente
  // Marca un cliente como validado (revision del administrador).
  validate: (id) => client.patch(`/clients/${id}/validate`).then((r) => r.data),
  // Historial de equipo del cliente: sus maquinas, cotizaciones/ordenes/visitas de cada
  // una, y el total facturado historicamente.
  getHistory: (id) => client.get(`/clients/${id}/history`).then((r) => r.data),
  remove: (id) => client.delete(`/clients/${id}`).then((r) => r.data), // elimina un cliente
};
