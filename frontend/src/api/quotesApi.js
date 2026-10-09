// Este archivo maneja las "cotizaciones" (presupuestos) que se envian a los clientes.
import { client } from './client.js';

export const quotesApi = {
  list:         ()            => client.get('/quotes').then(r => r.data),
  get:          (id)          => client.get(`/quotes/${id}`).then(r => r.data),
  create:       (payload)     => client.post('/quotes', payload).then(r => r.data),
  update:       (id, payload) => client.put(`/quotes/${id}`, payload).then(r => r.data),
  // Cambia solo el estado de la cotizacion -- un clic en la tarjeta (Borrador -> Enviada ->
  // Aprobada/Rechazada) o el boton "Reiniciar a Borrador" (requiere el permiso
  // quotes.reset-status; el servidor lo rechaza con 403 si no se tiene).
  updateStatus: (id, status)  => client.patch(`/quotes/${id}/status`, { status }).then(r => r.data),
  // Duplica una cotizacion Vencida en una nueva, en Borrador, con el siguiente numero.
  duplicate:    (id)          => client.post(`/quotes/${id}/duplicate`).then(r => r.data),
  // Cotizaciones que vencen pronto y siguen sin aprobar/rechazar (alerta del Dashboard).
  expiringSoon: ()            => client.get('/quotes/alerts/expiring-soon').then(r => r.data),
  remove:       (id)          => client.delete(`/quotes/${id}`).then(r => r.data),
  // Manda la cotizacion al cliente por correo con el PDF adjunto (el envio lo
  // hace n8n; ver Configuracion > Notificaciones).
  sendEmail:    (id, email, message) => client.post(`/quotes/${id}/send-email`, { email, message }).then(r => r.data),
  // Mapa de Relaciones: cadena de documentos (Cotizacion -> Orden(es) -> Reporte -> Factura).
  getDocumentFlow: (id) => client.get(`/quotes/${id}/document-flow`).then(r => r.data),
};
