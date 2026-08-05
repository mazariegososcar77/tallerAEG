// Este archivo maneja las "ordenes de trabajo" (el equipo que un cliente deja en el taller para reparacion).
import { client } from './client.js';

export const workOrdersApi = {
  list:         ()         => client.get('/work-orders').then(r => r.data),
  get:          (id)       => client.get(`/work-orders/${id}`).then(r => r.data),
  create:       (payload)  => client.post('/work-orders', payload).then(r => r.data),
  update:       (id, payload) => client.put(`/work-orders/${id}`, payload).then(r => r.data),
  // Cambia solo el estado de la orden (recibido, en_proceso, listo, entregado o cancelado).
  updateStatus: (id, status)  => client.patch(`/work-orders/${id}/status`, { status }).then(r => r.data),
  remove:       (id)       => client.delete(`/work-orders/${id}`).then(r => r.data),
};
