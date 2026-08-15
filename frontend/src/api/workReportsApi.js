// Este archivo maneja los "reportes de trabajo" (la documentacion fotografica de una reparacion, en 4 etapas).
//
// Las fotos y las firmas ya NO viajan al servidor: se suben directo a Google Cloud
// Storage con una URL firmada (ver lib/upload.js) y al backend solo se le manda la
// ruta con la que quedaron guardadas. Si el sistema todavia guarda en el disco del
// servidor, `subirArchivo` devuelve null y se usa el envio multipart de siempre --
// por eso cada funcion tiene los dos caminos.
import { client } from './client.js';
import { subirArchivo } from '../lib/upload.js';

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
  // `onProgress` recibe el avance de 0 a 100 mientras la foto sube al bucket.
  addPhoto: async (id, file, { stage, caption, onProgress } = {}) => {
    const rutaObjeto = await subirArchivo(file, { entidad: 'reportes', onProgress });
    if (rutaObjeto) {
      return client.post(`/work-reports/${id}/photos`, { stage, caption, object_path: rutaObjeto })
        .then(r => r.data);
    }
    const form = new FormData();
    form.append('photo', file);
    form.append('stage', stage);
    if (caption) form.append('caption', caption);
    return client.post(`/work-reports/${id}/photos`, form).then(r => r.data);
  },
  removePhoto: (id, photoId) => client.delete(`/work-reports/${id}/photos/${photoId}`).then(r => r.data),
  // Sube (o reemplaza) el video final de prueba del reporte.
  //
  // Es el UNICO archivo que sigue viajando al servidor, y a proposito: alla se mide
  // con ffprobe (se rechaza si pasa de 30 segundos) y se comprime con ffmpeg antes
  // de guardarlo. Lo que si cambia es donde termina: el MP4 ya comprimido se sube al
  // bucket, no al disco de la VM.
  uploadVideo: (id, file) => {
    const form = new FormData();
    form.append('video', file);
    return client.post(`/work-reports/${id}/video`, form).then(r => r.data);
  },
  removeVideo: (id) => client.delete(`/work-reports/${id}/video`).then(r => r.data),
  // Sube la imagen de una firma (tecnico o cliente que recibe) capturada en pantalla.
  setSignature: async (id, file, role, name) => {
    const rutaObjeto = await subirArchivo(file, { entidad: 'firmas' });
    if (rutaObjeto) {
      return client.post(`/work-reports/${id}/signature`, { role, name, object_path: rutaObjeto })
        .then(r => r.data);
    }
    const form = new FormData();
    form.append('photo', file);
    form.append('role', role);
    form.append('name', name);
    return client.post(`/work-reports/${id}/signature`, form).then(r => r.data);
  },
  // Genera (o recupera) el enlace publico de firma remota del cliente, para
  // entregas con mensajero (el cliente no esta en el taller). Devuelve { token }.
  getSigningLink: (id) => client.post(`/work-reports/${id}/signing-link`).then(r => r.data),
  // Mapa de Relaciones: cadena de documentos (Cotizacion -> Orden -> Reporte -> Factura).
  getDocumentFlow: (id) => client.get(`/work-reports/${id}/document-flow`).then(r => r.data),
};

// Funciones PUBLICAS (sin sesion iniciada) para la pantalla de firma remota
// (pages/public/PublicSignaturePage.jsx). Usan el mismo cliente Axios de
// siempre: su interceptor de 401 solo actua si habia una sesion previa, asi
// que es seguro llamarlas desde una pantalla sin login.
export const publicWorkReportsApi = {
  get: (token) => client.get(`/public/work-reports/${token}`).then(r => r.data),
  // Aqui no hay sesion: la subida se autoriza con el mismo token del enlace, por eso
  // pide la URL firmada a su propio endpoint publico y no al general.
  setSignature: async (token, file, name) => {
    const rutaObjeto = await subirArchivo(file, {
      endpoint: `/public/work-reports/${token}/signature/signed-url`,
    });
    if (rutaObjeto) {
      return client.post(`/public/work-reports/${token}/signature`, { name, object_path: rutaObjeto })
        .then(r => r.data);
    }
    const form = new FormData();
    form.append('photo', file);
    form.append('name', name);
    return client.post(`/public/work-reports/${token}/signature`, form).then(r => r.data);
  },
};
