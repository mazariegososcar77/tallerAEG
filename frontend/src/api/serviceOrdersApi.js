// Este archivo maneja las "ordenes de servicio": el formato de visita tecnica de campo
// (bombas/pozos en el sitio del cliente) que usa el taller.
import { client } from './client.js';

export const serviceOrdersApi = {
  list:         ()         => client.get('/service-orders').then(r => r.data),
  get:          (id)       => client.get(`/service-orders/${id}`).then(r => r.data),
  create:       (payload)  => client.post('/service-orders', payload).then(r => r.data),
  update:       (id, payload) => client.put(`/service-orders/${id}`, payload).then(r => r.data),
  // Cambia solo el estado de la orden (programada, en_proceso, completada o cancelada).
  updateStatus: (id, status)  => client.patch(`/service-orders/${id}/status`, { status }).then(r => r.data),
  remove:       (id)       => client.delete(`/service-orders/${id}`).then(r => r.data),
  // Sube la imagen de una firma (tecnico o cliente) capturada en pantalla.
  setSignature: (id, file, role, name) => {
    const form = new FormData();
    form.append('photo', file);
    form.append('role', role);
    form.append('name', name);
    return client.post(`/service-orders/${id}/signature`, form).then(r => r.data);
  },
  // Genera (o recupera) el enlace publico de firma remota del cliente.
  getSigningLink: (id) => client.post(`/service-orders/${id}/signing-link`).then(r => r.data),
};

// Funciones PUBLICAS (sin sesion) para la pantalla de firma remota.
export const publicServiceOrdersApi = {
  get: (token) => client.get(`/public/service-orders/${token}`).then(r => r.data),
  setSignature: (token, file, name) => {
    const form = new FormData();
    form.append('photo', file);
    form.append('name', name);
    return client.post(`/public/service-orders/${token}/signature`, form).then(r => r.data);
  },
};
