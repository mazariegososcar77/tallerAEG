// Este archivo maneja los "reportes de trabajo" (la documentacion fotografica de una reparacion, en 4 etapas).
import { client } from './client.js';

export const workReportsApi = {
  list:         ()         => client.get('/work-reports').then(r => r.data),
  get:          (id)       => client.get(`/work-reports/${id}`).then(r => r.data),
  // Crea el reporte para una orden de trabajo (si ya existe uno para esa orden, no crea otro).
  createForOrder: (workOrderId) => client.post('/work-reports', { work_order_id: workOrderId }).then(r => r.data),
  // Igual, pero para una orden de servicio (subcontrato).
  createForServiceOrder: (serviceOrderId) => client.post('/work-reports', { service_order_id: serviceOrderId }).then(r => r.data),
  update:       (id, payload) => client.put(`/work-reports/${id}`, payload).then(r => r.data),
  // Cierra el reporte de forma definitiva y genera la factura correspondiente.
  finalize:     (id)       => client.post(`/work-reports/${id}/finalize`).then(r => r.data),
  remove:       (id)       => client.delete(`/work-reports/${id}`).then(r => r.data),
  // Sube una foto de una etapa del reporte, con su nota (caption) opcional.
  addPhoto: (id, file, { stage, caption }) => {
    const form = new FormData();
    form.append('photo', file);
    form.append('stage', stage);
    if (caption) form.append('caption', caption);
    return client.post(`/work-reports/${id}/photos`, form).then(r => r.data);
  },
  removePhoto: (id, photoId) => client.delete(`/work-reports/${id}/photos/${photoId}`).then(r => r.data),
  // Sube la imagen de una firma (tecnico o cliente que recibe) capturada en pantalla.
  setSignature: (id, file, role, name) => {
    const form = new FormData();
    form.append('photo', file);
    form.append('role', role);
    form.append('name', name);
    return client.post(`/work-reports/${id}/signature`, form).then(r => r.data);
  },
  // Genera (o recupera) el enlace publico de firma remota del cliente, para
  // entregas con mensajero (el cliente no esta en el taller). Devuelve { token }.
  getSigningLink: (id) => client.post(`/work-reports/${id}/signing-link`).then(r => r.data),
};

// Funciones PUBLICAS (sin sesion iniciada) para la pantalla de firma remota
// (pages/public/PublicSignaturePage.jsx). Usan el mismo cliente Axios de
// siempre: su interceptor de 401 solo actua si habia una sesion previa, asi
// que es seguro llamarlas desde una pantalla sin login.
export const publicWorkReportsApi = {
  get: (token) => client.get(`/public/work-reports/${token}`).then(r => r.data),
  setSignature: (token, file, name) => {
    const form = new FormData();
    form.append('photo', file);
    form.append('name', name);
    return client.post(`/public/work-reports/${token}/signature`, form).then(r => r.data);
  },
};
