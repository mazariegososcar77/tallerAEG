// Este archivo maneja los REPORTES DE TRABAJO: la documentacion fotografica de una
// orden de trabajo, en 4 etapas fijas del proceso (antes de desarmar, desarmado,
// piezas instaladas/usadas, armado final), con fotos, una nota por etapa y las
// firmas del tecnico y del cliente. Es el tercer paso del flujo del taller
// (Cotizacion -> Orden de Trabajo -> Reporte de Trabajo -> Factura): al FINALIZAR
// un reporte, el sistema genera automaticamente la factura correspondiente.
import * as workReportRepository from '../repositories/workReportRepository.js';
import * as workOrderRepository from '../repositories/workOrderRepository.js';
import * as invoiceService from './invoiceService.js';
import { ApiError } from '../utils/ApiError.js';

// Las 4 etapas fijas por las que pasa todo reporte de trabajo, en orden.
export const STAGES = ['antes', 'desarmado', 'piezas_nuevas', 'armado_final'];

// Nombres en espanol de cada etapa, para mostrar en los mensajes de "falta esto".
const STAGE_LABELS = {
  antes: 'Antes de Desarmar',
  desarmado: 'Desarmado + Piezas Nuevas',
  piezas_nuevas: 'Piezas Instaladas + Piezas Usadas',
  armado_final: 'Armado Final',
};

/**
 * Revisa que requisitos le faltan a un reporte para poder finalizarse: cada una de
 * las 4 etapas necesita al menos una foto y una nota escrita, y hacen falta las
 * firmas del tecnico que entrega y de quien recibe. Esta regla existe para que no
 * se cierre (y facture) un trabajo sin dejar constancia completa de lo que se hizo.
 * Devuelve la lista de lo que falta (vacia si ya se puede finalizar).
 */
function getMissingRequirements(report) {
  const missing = [];
  const stageNotes = report.stage_notes || {};
  for (const stage of STAGES) {
    const hasPhoto = report.photos.some((p) => p.stage === stage);
    if (!hasPhoto) missing.push(`foto de la etapa "${STAGE_LABELS[stage]}"`);
    if (!stageNotes[stage]?.trim()) missing.push(`nota de la etapa "${STAGE_LABELS[stage]}"`);
  }
  if (!report.tech_signature_url) missing.push('firma del tecnico que entrega');
  if (!report.client_signature_url) missing.push('firma de quien recibe');
  return missing;
}

// Devuelve la lista completa de reportes de trabajo.
export async function list() {
  return workReportRepository.getAll();
}

// Busca un reporte por id e incluye la lista de "que le falta para finalizarse"
// (vacia si ya esta finalizado), para que la pantalla pueda mostrar un checklist
// sin tener que repetir esa regla en el frontend.
export async function getById(id) {
  const report = await workReportRepository.findById(id);
  if (!report) throw new ApiError(404, 'Reporte de trabajo no encontrado');
  report.missing_requirements = report.status === 'finalizado' ? [] : getMissingRequirements(report);
  return report;
}

/**
 * Crea el reporte de trabajo de una orden (se llama al presionar el boton
 * "Reporte" en la orden de trabajo). Es idempotente: si la orden ya tiene un
 * reporte, devuelve ese mismo en vez de crear uno duplicado (una orden solo puede
 * tener un reporte).
 */
export async function createForOrder(workOrderId) {
  const order = await workOrderRepository.findById(workOrderId);
  if (!order) throw new ApiError(404, 'Orden de trabajo no encontrada');
  const existing = await workReportRepository.findByWorkOrderId(workOrderId);
  if (existing) return existing;
  const number = await workReportRepository.getNextNumber();
  return workReportRepository.create({ work_order_id: workOrderId, number, status: 'en_progreso' });
}

// Guarda las notas generales y/o las notas por etapa de un reporte. Si el reporte
// ya esta finalizado, queda bloqueado para edicion (de solo lectura) salvo que
// quien edita tenga el permiso especial "forzar edicion" (canForceEdit),
// reservado normalmente para Administrador.
export async function update(id, { general_notes, stage_notes }, canForceEdit = false) {
  const existing = await workReportRepository.findById(id);
  if (!existing) throw new ApiError(404, 'Reporte de trabajo no encontrado');
  if (existing.status === 'finalizado' && !canForceEdit) {
    throw new ApiError(409, 'El reporte ya esta finalizado');
  }
  const data = {};
  if (general_notes !== undefined) data.general_notes = general_notes;
  if (stage_notes !== undefined) data.stage_notes = stage_notes;
  return workReportRepository.update(id, data);
}

// Agrega una foto a una etapa del reporte. Respeta el mismo bloqueo de "reporte
// finalizado" que las notas, valida que la etapa sea una de las 4 permitidas y
// que realmente haya llegado un archivo.
export async function addPhoto(id, { stage, caption }, file, canForceEdit = false) {
  const report = await workReportRepository.findById(id);
  if (!report) throw new ApiError(404, 'Reporte de trabajo no encontrado');
  if (report.status === 'finalizado' && !canForceEdit) {
    throw new ApiError(409, 'El reporte ya esta finalizado');
  }
  if (!STAGES.includes(stage)) throw new ApiError(400, 'Etapa invalida');
  if (!file) throw new ApiError(400, 'No se recibio la foto');
  const sortOrder = report.photos.filter((p) => p.stage === stage).length;
  const photoUrl = '/uploads/' + file.filename;
  return workReportRepository.addPhoto(id, { stage, photo_url: photoUrl, caption, sort_order: sortOrder });
}

// Elimina una foto de un reporte (respetando el mismo bloqueo de "finalizado").
// Verifica que la foto realmente pertenezca a este reporte, para que no se pueda
// borrar por error la foto de otro reporte.
export async function removePhoto(id, photoId, canForceEdit = false) {
  const report = await workReportRepository.findById(id);
  if (!report) throw new ApiError(404, 'Reporte de trabajo no encontrado');
  if (report.status === 'finalizado' && !canForceEdit) {
    throw new ApiError(409, 'El reporte ya esta finalizado');
  }
  const photo = await workReportRepository.findPhotoById(photoId);
  if (!photo || photo.work_report_id !== Number(id)) throw new ApiError(404, 'Foto no encontrada');
  return workReportRepository.removePhoto(photoId);
}

// Guarda la firma (dibujada a mano y convertida a imagen) del tecnico o del
// cliente en el reporte. Respeta el mismo bloqueo de "finalizado".
export async function setSignature(id, role, name, file, canForceEdit = false) {
  const report = await workReportRepository.findById(id);
  if (!report) throw new ApiError(404, 'Reporte de trabajo no encontrado');
  if (report.status === 'finalizado' && !canForceEdit) {
    throw new ApiError(409, 'El reporte ya esta finalizado');
  }
  if (!['tech', 'client'].includes(role)) throw new ApiError(400, 'Rol de firma invalido');
  if (!file) throw new ApiError(400, 'No se recibio la firma');
  const url = '/uploads/' + file.filename;
  const data = role === 'tech'
    ? { tech_signature_url: url, tech_signature_name: name || null }
    : { client_signature_url: url, client_signature_name: name || null };
  return workReportRepository.update(id, data);
}

/**
 * Cierra un reporte de trabajo y, con eso, genera automaticamente la factura del
 * trabajo (createFromWorkReport en invoiceService). No deja finalizar si falta
 * algun requisito (fotos, notas o firmas de las 4 etapas) — devuelve el detalle
 * de que falta para que el usuario lo complete. Si el reporte ya estaba
 * finalizado, no lo vuelve a procesar: simplemente devuelve el reporte y su
 * factura ya existente (evita generar una factura duplicada).
 */
export async function finalize(id) {
  const report = await workReportRepository.findById(id);
  if (!report) throw new ApiError(404, 'Reporte de trabajo no encontrado');
  if (report.status === 'finalizado') {
    const invoice = await invoiceService.getByWorkOrderId(report.work_order_id);
    return { report, invoice };
  }
  const missing = getMissingRequirements(report);
  if (missing.length > 0) {
    throw new ApiError(400, `Faltan datos obligatorios para finalizar: ${missing.join(', ')}.`);
  }
  const updated = await workReportRepository.update(id, {
    status: 'finalizado',
    finalized_at: new Date(),
  });
  const invoice = await invoiceService.createFromWorkReport(updated);
  return { report: updated, invoice };
}

// Elimina un reporte de trabajo.
export async function remove(id) {
  const existing = await workReportRepository.findById(id);
  if (!existing) throw new ApiError(404, 'Reporte de trabajo no encontrado');
  return workReportRepository.remove(id);
}
