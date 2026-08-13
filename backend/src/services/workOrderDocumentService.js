// Este archivo maneja los DOCUMENTOS ADJUNTOS de una orden de trabajo: la
// papeleria de terceros que acompana al trabajo (factura del taller de torneado,
// certificado de un bobinado, cotizacion de un proveedor, un recibo fotografiado).
//
// Ademas de guardarlos, aqui vive la regla del PASO PREVIO A FACTURAR: antes de
// que una orden genere factura, alguien tiene que haber revisado sus documentos
// -- aunque sea para decir que no hay ninguno. Ver requireReviewed, que es lo que
// consultan los dos caminos por los que nace una factura.
import fs from 'fs';
import path from 'path';
import * as workOrderDocumentRepository from '../repositories/workOrderDocumentRepository.js';
import * as workOrderRepository from '../repositories/workOrderRepository.js';
import { UPLOADS_DIR } from '../middleware/upload.middleware.js';
import { ApiError } from '../utils/ApiError.js';

// Confirma que la orden existe antes de colgarle (o leerle) documentos.
async function getOrder(workOrderId) {
  const order = await workOrderRepository.findById(workOrderId);
  if (!order) throw new ApiError(404, 'Orden de trabajo no encontrada');
  return order;
}

// Lista los documentos adjuntos de una orden.
export async function list(workOrderId) {
  await getOrder(workOrderId);
  return workOrderDocumentRepository.findByWorkOrderId(workOrderId);
}

/**
 * Adjunta un documento a la orden. El titulo es obligatorio a proposito: el nombre
 * con que llega el archivo casi nunca dice nada util ("scan_0012.pdf"), y en una
 * lista de cinco adjuntos eso no le sirve a nadie.
 */
export async function add(workOrderId, { title }, file, userId = null) {
  await getOrder(workOrderId);
  if (!file) throw new ApiError(400, 'No se recibio el documento');
  const cleanTitle = (title || '').trim();
  if (!cleanTitle) throw new ApiError(400, 'El documento necesita un titulo');

  return workOrderDocumentRepository.create({
    work_order_id: Number(workOrderId),
    title: cleanTitle,
    file_url: '/uploads/' + file.filename,
    original_name: file.originalname || null,
    mime_type: file.mimetype || null,
    size_bytes: file.size || null,
    uploaded_by: userId,
  });
}

/**
 * Quita un documento de la orden (solo Administrador -- ver el permiso
 * work-order-documents.delete en la ruta). Verifica que el documento pertenezca a
 * esta orden, para que no se borre por error el de otra.
 *
 * Borra tambien el archivo del disco: un adjunto puede pesar varios MB y dejarlo
 * ahi despues de quitarlo de la orden solo llena el servidor con algo que ya nadie
 * puede alcanzar. Si el archivo ya no estaba, se sigue igual -- lo que importa es
 * que el registro desaparezca.
 */
export async function remove(workOrderId, documentId) {
  await getOrder(workOrderId);
  const doc = await workOrderDocumentRepository.findById(documentId);
  if (!doc || doc.work_order_id !== Number(workOrderId)) {
    throw new ApiError(404, 'Documento no encontrado');
  }
  await workOrderDocumentRepository.remove(documentId);
  try {
    fs.unlinkSync(path.join(UPLOADS_DIR, path.basename(doc.file_url)));
  } catch {
    // El archivo ya no existe en disco: no es un error que valga la pena propagar.
  }
  return true;
}

/**
 * Deja constancia de que alguien reviso los documentos de esta orden. Es lo que
 * destraba la facturacion.
 *
 * Confirmar que NO hay documentos adicionales es una respuesta perfectamente
 * valida y llena esta marca igual: el punto del paso no es obligar a subir algo,
 * es que nadie facture sin haberse hecho la pregunta, y que quede registrado quien
 * la respondio y cuando.
 *
 * Es idempotente: si ya estaba revisada, se devuelve tal cual sin repisar quien la
 * reviso primero.
 */
export async function markReviewed(workOrderId, userId = null) {
  const order = await getOrder(workOrderId);
  if (order.documents_reviewed_at) return order;
  await workOrderRepository.markDocumentsReviewed(workOrderId, userId);
  return workOrderRepository.findById(workOrderId);
}

/**
 * Corta la operacion si la orden todavia no paso por el paso de documentos. La
 * usan los DOS caminos por los que nace una factura: al finalizar el reporte en el
 * flujo Pre, y al generar la factura a mano en el flujo Post.
 *
 * Va en el backend y no solo en la pantalla porque un bloqueo que vive unicamente
 * en el boton no bloquea nada: se lo salta cualquiera que llame la API directo, y
 * desaparece el dia que alguien reordene el componente.
 */
export async function requireReviewed(workOrderId) {
  const order = await getOrder(workOrderId);
  if (!order.documents_reviewed_at) {
    throw new ApiError(409,
      'Antes de facturar hay que revisar los documentos de la orden. ' +
      'Abri la seccion "Documentos" de la orden y confirma si hay archivos adicionales que adjuntar.'
    );
  }
  return order;
}
