// Este archivo maneja las "ordenes de trabajo" (el equipo que un cliente deja en el taller para reparacion).
import { client } from './client.js';
import { subirArchivo, tipoDeArchivo } from '../lib/upload.js';

export const workOrdersApi = {
  list:         ()         => client.get('/work-orders').then(r => r.data),
  get:          (id)       => client.get(`/work-orders/${id}`).then(r => r.data),
  create:       (payload)  => client.post('/work-orders', payload).then(r => r.data),
  update:       (id, payload) => client.put(`/work-orders/${id}`, payload).then(r => r.data),
  // Cambia solo el estado de la orden (recibido, en_proceso, listo, entregado o cancelado).
  updateStatus: (id, status)  => client.patch(`/work-orders/${id}/status`, { status }).then(r => r.data),
  remove:       (id)       => client.delete(`/work-orders/${id}`).then(r => r.data),
  // Mapa de Relaciones: cadena de documentos (Cotizacion -> Orden -> Reporte -> Factura).
  getDocumentFlow: (id) => client.get(`/work-orders/${id}/document-flow`).then(r => r.data),

  // --- Documentos adjuntos (papeleria de terceros: factura del torneador,
  // certificados, cotizaciones de proveedores) ---
  documents:       (id) => client.get(`/work-orders/${id}/documents`).then(r => r.data),
  // El archivo va directo al bucket y al servidor solo se le manda la ruta mas los
  // datos que ya no puede leer solo (nombre original, tipo y tamano), que son los
  // que despues se ven en la lista de adjuntos. Ver lib/upload.js.
  addDocument:     async (id, file, title, onProgress) => {
    const rutaObjeto = await subirArchivo(file, { entidad: 'documentos', onProgress });
    if (rutaObjeto) {
      return client.post(`/work-orders/${id}/documents`, {
        title,
        object_path: rutaObjeto,
        original_name: file.name,
        mime_type: tipoDeArchivo(file),
        size_bytes: file.size,
      }).then(r => r.data);
    }
    const form = new FormData();
    form.append('document', file);
    form.append('title', title);
    return client.post(`/work-orders/${id}/documents`, form).then(r => r.data);
  },
  removeDocument:  (id, documentId) => client.delete(`/work-orders/${id}/documents/${documentId}`).then(r => r.data),
  // Deja constancia de que ya se revisaron los documentos de la orden. Es el paso
  // que destraba la facturacion: sin esto, finalizar el reporte (Pre) o generar la
  // factura (Post) responden 409.
  reviewDocuments: (id) => client.post(`/work-orders/${id}/documents/review`).then(r => r.data),
};
