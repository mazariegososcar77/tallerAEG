import * as workReportRepository from '../repositories/workReportRepository.js';
import * as workOrderRepository from '../repositories/workOrderRepository.js';
import * as invoiceService from './invoiceService.js';
import { ApiError } from '../utils/ApiError.js';

export const STAGES = ['antes', 'desarmado', 'piezas_nuevas', 'armado_final'];

const STAGE_LABELS = {
  antes: 'Antes de Desarmar',
  desarmado: 'Desarmado + Piezas Nuevas',
  piezas_nuevas: 'Piezas Instaladas + Piezas Usadas',
  armado_final: 'Armado Final',
};

/** Fotos + nota por cada etapa, y ambas firmas, son obligatorias para finalizar. */
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

export async function list() {
  return workReportRepository.getAll();
}

export async function getById(id) {
  const report = await workReportRepository.findById(id);
  if (!report) throw new ApiError(404, 'Reporte de trabajo no encontrado');
  report.missing_requirements = report.status === 'finalizado' ? [] : getMissingRequirements(report);
  return report;
}

/** Idempotente: si la orden ya tiene un reporte, lo devuelve en vez de crear otro. */
export async function createForOrder(workOrderId) {
  const order = await workOrderRepository.findById(workOrderId);
  if (!order) throw new ApiError(404, 'Orden de trabajo no encontrada');
  const existing = await workReportRepository.findByWorkOrderId(workOrderId);
  if (existing) return existing;
  const number = await workReportRepository.getNextNumber();
  return workReportRepository.create({ work_order_id: workOrderId, number, status: 'en_progreso' });
}

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
  // Al finalizar el reporte, la orden de trabajo asociada pasa a "listo"
  // (no se degrada si ya fue entregada o cancelada).
  const order = await workOrderRepository.findById(report.work_order_id);
  if (order && !['entregado', 'cancelado'].includes(order.status)) {
    await workOrderRepository.update(report.work_order_id, { status: 'listo' });
  }
  const invoice = await invoiceService.createFromWorkReport(updated);
  return { report: updated, invoice };
}

export async function remove(id) {
  const existing = await workReportRepository.findById(id);
  if (!existing) throw new ApiError(404, 'Reporte de trabajo no encontrado');
  return workReportRepository.remove(id);
}
