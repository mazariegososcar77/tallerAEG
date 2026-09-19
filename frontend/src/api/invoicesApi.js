// Este archivo maneja las "facturas" que se generan al finalizar un reporte de trabajo.
import { client } from './client.js';

export const invoicesApi = {
  list:    ()           => client.get('/invoices').then(r => r.data),
  get:     (id)         => client.get(`/invoices/${id}`).then(r => r.data),
  // Certifica la factura ante la SAT via Digifact (o solo administrativamente si faltan credenciales) y manda el PDF oficial al correo indicado.
  certify: (id, email)  => client.post(`/invoices/${id}/certify`, { email }).then(r => r.data),
  // Digifact: ¿esta configurado y en que ambiente (pruebas / real)?
  felStatus: () => client.get('/invoices/fel/status').then(r => r.data),
  // Consulta un NIT en la SAT: { configured, found, name }.
  lookupNit: (nit) => client.get(`/invoices/nit/${encodeURIComponent(nit)}`).then(r => r.data),
  // Reenvia por correo el PDF oficial de una factura certificada (el correo es opcional).
  sendEmail: (id, email) => client.post(`/invoices/${id}/send-email`, email ? { email } : {}).then(r => r.data),
  // Anula una factura certificada (ante la SAT si se certifico de verdad). Motivo obligatorio.
  cancel: (id, reason) => client.post(`/invoices/${id}/cancel`, { reason }).then(r => r.data),
  // Flujo Post: genera a mano la factura de una orden ya cotizada y aprobada (no hay factura automatica como en Pre).
  createFromWorkOrder: (workOrderId) => client.post(`/invoices/from-work-order/${workOrderId}`).then(r => r.data),
  // Mapa de Relaciones: cadena de documentos (Cotizacion -> Orden -> Reporte -> Factura).
  getDocumentFlow: (id) => client.get(`/invoices/${id}/document-flow`).then(r => r.data),
};
