// Este archivo maneja las "ordenes de servicio" (trabajos que el taller manda a hacer
// afuera con un subcontratista externo, ej. torneado).
import { client } from './client.js';

export const serviceOrdersApi = {
  list:         ()         => client.get('/service-orders').then(r => r.data),
  get:          (id)       => client.get(`/service-orders/${id}`).then(r => r.data),
  create:       (payload)  => client.post('/service-orders', payload).then(r => r.data),
  update:       (id, payload) => client.put(`/service-orders/${id}`, payload).then(r => r.data),
  // Cambia solo el estado de la orden (enviada, en_proceso, recibida o cancelada).
  updateStatus: (id, status)  => client.patch(`/service-orders/${id}/status`, { status }).then(r => r.data),
  remove:       (id)       => client.delete(`/service-orders/${id}`).then(r => r.data),
};
