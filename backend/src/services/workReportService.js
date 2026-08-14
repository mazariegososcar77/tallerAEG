// Este archivo maneja los REPORTES DE TRABAJO: la documentacion fotografica de una
// orden de trabajo, en 4 etapas fijas del proceso (antes de desarmar, desarmado,
// piezas instaladas/usadas, armado final), con fotos, una nota por etapa y las
// firmas del tecnico y del cliente. Es el tercer paso del flujo del taller
// (Cotizacion -> Orden de Trabajo -> Reporte de Trabajo -> Factura): al FINALIZAR
// un reporte, el sistema genera automaticamente la factura correspondiente.
import crypto from 'crypto';
import path from 'path';
import fs from 'fs/promises';
import { withTransaction } from '../lib/db.js';
import * as workReportRepository from '../repositories/workReportRepository.js';
import * as workReportItemRepository from '../repositories/workReportItemRepository.js';
import * as workOrderRepository from '../repositories/workOrderRepository.js';
import * as serviceOrderRepository from '../repositories/serviceOrderRepository.js';
import * as articleRepository from '../repositories/articleRepository.js';
import * as invoiceService from './invoiceService.js';
import * as inventoryService from './inventoryService.js';
import * as workOrderDocumentService from './workOrderDocumentService.js';
import { compressPhoto, processVideo, MAX_VIDEO_SECONDS } from '../lib/mediaProcessing.js';
import { UPLOADS_DIR } from '../middleware/upload.middleware.js';
import { ApiError } from '../utils/ApiError.js';

// Version 1 (legado): las 4 etapas fijas con las que nacio este modulo. Todo
// reporte que ya existia al desplegar las categorias nuevas se queda para
// siempre en este esquema (photo_schema_version=1, ver
// 037_work_report_photo_categories.sql) -- ni su UI ni esta validacion
// cambian, asi las fotos/notas que ya tenia un reporte viejo no se rompen.
export const STAGES = ['antes', 'desarmado', 'piezas_nuevas', 'armado_final'];
const STAGE_LABELS = {
  antes: 'Antes de Desarmar',
  desarmado: 'Desarmado + Piezas Nuevas',
  piezas_nuevas: 'Piezas Instaladas + Piezas Usadas',
  armado_final: 'Armado Final',
};

// Version 2: las 8 categorias reales del manual de Abdias, cada una con un
// MINIMO de fotos (nunca un tope maximo -- el tecnico puede subir mas de las
// indicadas sin restriccion) + un video final de prueba obligatorio. Nace en
// todo reporte creado de aqui en adelante (DEFAULT de la columna).
export const PHOTO_CATEGORIES = [
  { key: 'ingreso',             label: 'Ingreso de Equipo',                  min: 1 },
  { key: 'placa_datos',         label: 'Placa de Datos',                     min: 1 },
  { key: 'mediciones_ingreso',  label: 'Mediciones Eléctricas de Ingreso',   min: 3 },
  { key: 'desarme',             label: 'Proceso de Desarme',                 min: 4 },
  { key: 'mantenimiento',       label: 'Mantenimiento o Rebobinado',         min: 7 },
  { key: 'repuestos',           label: 'Repuestos',                          min: 2 },
  { key: 'armado',              label: 'Equipo Armado',                      min: 1 },
  { key: 'mediciones_finales',  label: 'Mediciones Eléctricas Finales',      min: 1 },
];

// Etapas/categorias validas para un reporte, segun su esquema de fotos.
function stageKeysFor(report) {
  return report.photo_schema_version === 1 ? STAGES : PHOTO_CATEGORIES.map((c) => c.key);
}

/**
 * Revisa que requisitos le faltan a un reporte para poder finalizarse. Se
 * ramifica segun `photo_schema_version`: los reportes viejos (1) siguen
 * exigiendo exactamente lo de siempre (una foto + una nota por cada una de
 * las 4 etapas); los nuevos (2) exigen alcanzar el MINIMO de fotos de cada
 * una de las 8 categorias (no una cantidad exacta) + su nota, y ademas el
 * video final. En ambos casos hacen falta las firmas del tecnico que entrega
 * y de quien recibe. Esta regla existe para que no se cierre (y facture) un
 * trabajo sin dejar constancia completa de lo que se hizo. Devuelve la lista
 * de lo que falta (vacia si ya se puede finalizar).
 */
function getMissingRequirements(report) {
  const missing = [];
  const stageNotes = report.stage_notes || {};
  if (report.photo_schema_version === 1) {
    for (const stage of STAGES) {
      const hasPhoto = report.photos.some((p) => p.stage === stage);
      if (!hasPhoto) missing.push(`foto de la etapa "${STAGE_LABELS[stage]}"`);
      if (!stageNotes[stage]?.trim()) missing.push(`nota de la etapa "${STAGE_LABELS[stage]}"`);
    }
  } else {
    for (const cat of PHOTO_CATEGORIES) {
      const count = report.photos.filter((p) => p.stage === cat.key).length;
      if (count < cat.min) missing.push(`fotos de "${cat.label}" (tiene ${count}, mínimo ${cat.min})`);
      if (!stageNotes[cat.key]?.trim()) missing.push(`nota de "${cat.label}"`);
    }
    if (!report.final_video_url) missing.push(`video de prueba final (máximo ${MAX_VIDEO_SECONDS} segundos)`);
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

/**
 * Igual que createForOrder, pero para una Orden de Servicio (subcontrato). Un reporte
 * de Orden de Servicio nunca genera factura al finalizar (ver finalize) -- es
 * documentacion de un costo interno, no algo que se le cobra a un cliente.
 */
export async function createForServiceOrder(serviceOrderId) {
  const order = await serviceOrderRepository.findById(serviceOrderId);
  if (!order) throw new ApiError(404, 'Orden de servicio no encontrada');
  const existing = await workReportRepository.findByServiceOrderId(serviceOrderId);
  if (existing) return existing;
  const number = await workReportRepository.getNextNumber();
  return workReportRepository.create({ service_order_id: serviceOrderId, number, status: 'en_progreso' });
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

// Agrega una foto a una etapa/categoria del reporte. Respeta el mismo bloqueo
// de "reporte finalizado" que las notas, valida que la etapa sea una de las
// permitidas SEGUN el esquema de fotos de este reporte (las 4 de siempre para
// uno viejo, las 8 categorias nuevas para uno nuevo) y que realmente haya
// llegado un archivo. La foto se re-comprime en el disco antes de guardar su
// registro (ver mediaProcessing.js) -- nunca se guarda el archivo tal como lo
// mando el celular, para no llenar el disco ahora que no hay tope de fotos.
export async function addPhoto(id, { stage, caption }, file, canForceEdit = false) {
  const report = await workReportRepository.findById(id);
  if (!report) throw new ApiError(404, 'Reporte de trabajo no encontrado');
  if (report.status === 'finalizado' && !canForceEdit) {
    throw new ApiError(409, 'El reporte ya esta finalizado');
  }
  if (!stageKeysFor(report).includes(stage)) throw new ApiError(400, 'Etapa invalida');
  if (!file) throw new ApiError(400, 'No se recibio la foto');
  await compressPhoto(file.path);
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

// Borra del disco el archivo de video al que apunta una URL /uploads/... (si
// existia). No falla si el archivo ya no esta ahi -- mismo criterio que el
// resto del sistema con archivos subidos (ver pdfGenerator.js).
async function deleteVideoFile(videoUrl) {
  if (!videoUrl) return;
  await fs.unlink(path.join(UPLOADS_DIR, path.basename(videoUrl))).catch(() => {});
}

/**
 * Sube (o reemplaza) el video final de prueba del reporte: una sola ranura,
 * mismo criterio que la firma. Solo tiene sentido en un reporte version 2
 * (las 8 categorias nuevas) -- uno version 1 no tiene donde mostrarlo en su
 * pantalla, asi que se rechaza antes de gastar CPU procesando nada.
 *
 * El archivo que sube el celular es el CRUDO (sin comprimir, puede pesar
 * decenas de MB): `processVideo` lo mide (rechaza si excede
 * MAX_VIDEO_SECONDS), lo transcodea a un MP4 chico, y aqui se borra el crudo
 * y el video anterior (si habia) apenas termina -- nunca quedan dos videos
 * ocupando disco por el mismo reporte.
 */
export async function setVideo(id, file, canForceEdit = false) {
  const report = await workReportRepository.findById(id);
  if (!report) throw new ApiError(404, 'Reporte de trabajo no encontrado');
  if (report.status === 'finalizado' && !canForceEdit) {
    throw new ApiError(409, 'El reporte ya esta finalizado');
  }
  if (report.photo_schema_version === 1) {
    throw new ApiError(400, 'Este reporte usa el esquema de fotos anterior, sin video de prueba final');
  }
  if (!file) throw new ApiError(400, 'No se recibio el video');

  const filename = crypto.randomUUID() + '.mp4';
  const outputPath = path.join(UPLOADS_DIR, filename);
  try {
    const { durationSeconds, sizeBytes } = await processVideo(file.path, outputPath);
    await deleteVideoFile(report.final_video_url);
    return workReportRepository.setVideo(id, {
      final_video_url: '/uploads/' + filename,
      final_video_duration_seconds: durationSeconds,
      final_video_size_bytes: sizeBytes,
    });
  } catch (err) {
    await fs.unlink(outputPath).catch(() => {});
    throw err;
  } finally {
    // El archivo crudo que subio el celular nunca se guarda para siempre:
    // solo existio mientras se procesaba.
    await fs.unlink(file.path).catch(() => {});
  }
}

// Quita el video final de un reporte (respetando el mismo bloqueo de "finalizado").
export async function removeVideo(id, canForceEdit = false) {
  const report = await workReportRepository.findById(id);
  if (!report) throw new ApiError(404, 'Reporte de trabajo no encontrado');
  if (report.status === 'finalizado' && !canForceEdit) {
    throw new ApiError(409, 'El reporte ya esta finalizado');
  }
  await deleteVideoFile(report.final_video_url);
  return workReportRepository.removeVideo(id);
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
 * Genera (o devuelve, si ya existia) el token del enlace publico de firma
 * remota de este reporte -- lo usa el mensajero cuando entrega un equipo sin
 * que el cliente este en el taller, para firmar "Recibido" desde su propio
 * telefono sin iniciar sesion (ver rutas publicas en publicRoutes.js). Pedirlo
 * dos veces no invalida el link ya enviado: siempre devuelve el mismo token.
 */
export async function getSigningLink(id) {
  const report = await workReportRepository.findById(id);
  if (!report) throw new ApiError(404, 'Reporte de trabajo no encontrado');
  if (report.client_signature_token) return report.client_signature_token;
  const token = crypto.randomBytes(24).toString('base64url');
  await workReportRepository.update(id, { client_signature_token: token });
  return token;
}

/**
 * Version publica (sin sesion) de getById: para la pantalla que abre el
 * mensajero/cliente desde el enlace de firma remota. Devuelve solo lo
 * necesario para esa pantalla -- nada de notas internas ni otros datos.
 */
export async function getPublicByToken(token) {
  const report = await workReportRepository.findByPublicToken(token);
  if (!report) throw new ApiError(404, 'Enlace invalido o vencido');
  return {
    number: report.number,
    order_number: report.order_number,
    order_kind: report.order_kind,
    client_name: report.client_name,
    equipment_name: report.equipment_name,
    already_signed: Boolean(report.client_signature_url),
    client_signature_url: report.client_signature_url,
    client_signature_name: report.client_signature_name,
  };
}

// Guarda la firma del cliente desde el enlace publico (sin sesion): resuelve
// el reporte a partir del token y reutiliza exactamente la misma funcion
// setSignature de siempre (mismas reglas: si el reporte ya esta finalizado,
// queda bloqueado igual que para un usuario con sesion sin permiso de forzar
// edicion).
export async function setPublicClientSignature(token, name, file) {
  const report = await workReportRepository.findByPublicToken(token);
  if (!report) throw new ApiError(404, 'Enlace invalido o vencido');
  return setSignature(report.id, 'client', name, file, false);
}

// ---------------------------------------------------------------------------
// Material consumido (work_report_items)
// ---------------------------------------------------------------------------

/**
 * Confirma que el reporte existe y todavia se puede editar su material, dejando su fila
 * bloqueada por el resto de la transaccion (por eso exige la conexion de una).
 *
 * El material solo se toca mientras el reporte esta en borrador ('en_progreso'), y
 * aqui NO aplica el permiso de "forzar edicion" que si vale para fotos y notas: al
 * finalizar, el material ya se descargo de bodega, asi que cambiarlo por un costado
 * dejaria el kardex diciendo una cosa y el reporte otra. La via para corregirlo es
 * reabrir el reporte (reopen), que devuelve el material al inventario primero.
 *
 * Que la revision vaya bajo candado y dentro de la misma transaccion que el cambio es lo
 * que evita la rendija entre "esta en borrador" y "guardo el material": si alguien finaliza
 * el reporte justo en ese instante, esta linea entraria despues del descuento de bodega y
 * nunca se descontaria. Con el candado, o entra antes de finalizar, o el finalizar ya paso
 * y esta funcion responde 409.
 */
async function requireDraft(id, conn) {
  const report = await workReportRepository.lockById(id, conn);
  if (!report) throw new ApiError(404, 'Reporte de trabajo no encontrado');
  if (report.status !== 'en_progreso') {
    throw new ApiError(409, 'El reporte ya esta finalizado: para cambiar el material hay que reabrirlo');
  }
  return report;
}

// Lista el material cargado en un reporte (con codigo, nombre, unidad y existencia
// actual de cada articulo).
export async function listItems(id) {
  const report = await workReportRepository.findById(id);
  if (!report) throw new ApiError(404, 'Reporte de trabajo no encontrado');
  return workReportItemRepository.findByReportId(id);
}

/**
 * Agrega material al reporte. Si ese articulo ya estaba cargado, le SUMA la cantidad
 * en vez de fallar: la tabla no admite el mismo articulo dos veces en un reporte, y
 * para quien lo usa "agregar 2 cojinetes" dos veces significa 4 cojinetes, no un error.
 *
 * El costo que se guarda aqui es provisional; el definitivo se congela al finalizar
 * (ver snapshotCosts), que es el momento en que el material realmente sale de bodega.
 */
export async function addItem(id, { article_id, quantity }) {
  const qty = Number(quantity);
  if (!Number.isFinite(qty) || qty <= 0) {
    throw new ApiError(400, 'La cantidad debe ser mayor a cero');
  }
  const article = await articleRepository.findById(article_id);
  if (!article) throw new ApiError(404, 'Articulo no encontrado');
  return withTransaction(async (conn) => {
    await requireDraft(id, conn);
    const existing = await workReportItemRepository.findByReportAndArticle(id, article_id, conn);
    const cost = Number(article.cost ?? 0);
    if (existing) {
      const total = Number(existing.quantity) + qty;
      return workReportItemRepository.update(existing.id, {
        quantity: total,
        subtotal: Math.round(total * cost * 100) / 100,
      }, conn);
    }
    return workReportItemRepository.create({
      work_report_id: Number(id),
      article_id,
      quantity: qty,
      unit_cost: cost,
      subtotal: Math.round(qty * cost * 100) / 100,
    }, conn);
  });
}

// Cambia la cantidad de una linea de material ya cargada (aqui si se reemplaza el
// valor, no se suma: es una correccion, no una carga nueva).
export async function updateItem(id, itemId, { quantity }) {
  const qty = Number(quantity);
  if (!Number.isFinite(qty) || qty <= 0) {
    throw new ApiError(400, 'La cantidad debe ser mayor a cero');
  }
  return withTransaction(async (conn) => {
    await requireDraft(id, conn);
    const item = await workReportItemRepository.findById(itemId, conn);
    if (!item || item.work_report_id !== Number(id)) throw new ApiError(404, 'Material no encontrado');
    const cost = Number(item.unit_cost ?? 0);
    return workReportItemRepository.update(itemId, {
      quantity: qty,
      subtotal: Math.round(qty * cost * 100) / 100,
    }, conn);
  });
}

// Quita una linea de material del reporte. Verifica que pertenezca a este reporte,
// para que no se borre por error la de otro.
export async function removeItem(id, itemId) {
  return withTransaction(async (conn) => {
    await requireDraft(id, conn);
    const item = await workReportItemRepository.findById(itemId, conn);
    if (!item || item.work_report_id !== Number(id)) throw new ApiError(404, 'Material no encontrado');
    return workReportItemRepository.remove(itemId, conn);
  });
}

/**
 * Respuesta para un reporte que ya estaba finalizado: se devuelve tal como quedo, con su
 * factura si la tiene, sin volver a procesar nada. Cubre los dos casos en que finalize se
 * encuentra el trabajo ya hecho — se pidio finalizar algo que ya estaba cerrado, o dos
 * peticiones simultaneas y esta perdio la carrera por el candado — y en ambos evita
 * generar una factura duplicada o descontar el material dos veces.
 */
async function alreadyFinalizedResult(id) {
  const report = await workReportRepository.findById(id);
  const invoice = report.work_order_id ? await invoiceService.getByWorkOrderId(report.work_order_id) : null;
  return { report, invoice: invoice || null, stock_warnings: [] };
}

/**
 * Cierra un reporte de trabajo. Que pasa despues depende de que esta documentando:
 * - Orden de Trabajo, flujo "Pre" (el de siempre): genera automaticamente la factura
 *   (createFromWorkReport en invoiceService), porque la cotizacion ya existia de antes.
 * - Orden de Trabajo, flujo "Post": todavia NO se factura aqui: la cotizacion se arma
 *   DESPUES de este reporte (con el diagnostico ya conocido), asi que se devuelve
 *   `invoice: null` y el frontend lleva al usuario a crear la cotizacion en su lugar
 *   (ver QuoteFormPage ?fromWorkOrder=).
 * - Orden de Servicio (subcontrato): NUNCA factura -- es un costo interno, no algo que
 *   se le cobra a un cliente. Siempre devuelve `invoice: null`.
 * No deja finalizar si falta algun requisito (fotos, notas o firmas de las 4
 * etapas) — devuelve el detalle de que falta para que el usuario lo complete. Si
 * el reporte ya estaba finalizado, no lo vuelve a procesar: simplemente devuelve
 * el reporte y su factura ya existente si la hay (evita generar una duplicada).
 *
 * Finalizar es tambien el momento en que el material sale de bodega: el cambio de
 * estado y el descuento de inventario van en la MISMA transaccion, de modo que si el
 * descuento falla el reporte tampoco queda finalizado. Lo contrario dejaria un trabajo
 * cerrado y facturado con el inventario intacto, que es justo el descuadre silencioso
 * que este modulo existe para evitar.
 */
export async function finalize(id, userId = null) {
  const report = await workReportRepository.findById(id);
  if (!report) throw new ApiError(404, 'Reporte de trabajo no encontrado');
  if (report.status === 'finalizado') return alreadyFinalizedResult(id);
  const missing = getMissingRequirements(report);
  if (missing.length > 0) {
    throw new ApiError(400, `Faltan datos obligatorios para finalizar: ${missing.join(', ')}.`);
  }
  // Paso previo a facturar: alguien tiene que haber revisado los documentos de la
  // orden (aunque sea para confirmar que no hay ninguno). Se verifica ANTES de tocar
  // nada -- si esperara hasta el momento de crear la factura, el reporte ya habria
  // quedado finalizado y el material descontado de bodega, y el corte dejaria el
  // trabajo cerrado sin factura. Aqui simplemente no empieza.
  //
  // Solo aplica a reportes de Orden de Trabajo: los de Orden de Servicio nunca
  // generan factura, asi que no hay nada que trabar.
  if (report.work_order_id) {
    await workOrderDocumentService.requireReviewed(report.work_order_id);
  }

  const outcome = await withTransaction(async (conn) => {
    // Lo PRIMERO de la transaccion: tomar el candado del reporte y volver a leer su estado
    // ya adentro. La revision de arriba se hizo sin candado, asi que entre aquella y esta
    // cabe otro "Finalizar" del mismo reporte; el que llegue segundo espera aqui y, cuando
    // entra, encuentra el reporte ya finalizado y se va sin descontar nada. Sin esto, los
    // dos verian el reporte sin material descargado y bodega perderia el doble.
    const locked = await workReportRepository.lockById(id, conn);
    if (!locked) throw new ApiError(404, 'Reporte de trabajo no encontrado');
    if (locked.status === 'finalizado') return null;

    const saved = await workReportRepository.update(id, {
      status: 'finalizado',
      finalized_at: new Date(),
    }, conn);
    // Congela el costo del material con el costo de compra vigente hoy, y recien
    // entonces lo lee: lo que costo este trabajo queda fijo aunque manana cambie el
    // costo del articulo en el catalogo.
    await workReportItemRepository.snapshotCosts(id, conn);
    const items = await workReportItemRepository.findByReportId(id, conn);
    const { warnings } = await inventoryService.syncConsumption({
      referenceType: 'work_report',
      referenceId: Number(id),
      items,
      userId,
      conn,
    });
    return { updated: saved, stockWarnings: warnings };
  });

  // Otro lo finalizo mientras esperabamos el candado: no se procesa de nuevo.
  if (!outcome) return alreadyFinalizedResult(id);
  const { updated, stockWarnings } = outcome;

  // La factura se genera FUERA de la transaccion, despues de que el inventario ya
  // cuadro (es el orden que exige el flujo: primero baja el material, luego se cobra).
  let invoice = null;
  if (updated.work_order_id) {
    const order = await workOrderRepository.findById(updated.work_order_id);
    invoice = order?.flow_type === 'post' ? null : await invoiceService.createFromWorkReport(updated);
  }
  // Al finalizar el reporte, la orden de trabajo asociada pasa a "listo"
  // (no se degrada si ya fue entregada o cancelada).
  const order = await workOrderRepository.findById(report.work_order_id);
  if (order && !['entregado', 'cancelado'].includes(order.status)) {
    await workOrderRepository.update(report.work_order_id, { status: 'listo' });
  }
  return { report: updated, invoice, stock_warnings: stockWarnings };
}

/**
 * Reabre un reporte ya finalizado para poder corregirlo (permiso work-reports.force-edit,
 * normalmente solo Administrador).
 *
 * Devuelve el material al inventario: le pide al kardex dejar el consumo de este reporte
 * en cero, lo que genera las entradas que reponen exactamente lo que se habia descontado
 * — ni mas ni menos, porque se calcula contra lo que el kardex dice que salio, no contra
 * lo que las lineas dicen hoy. Igual que finalizar, el cambio de estado y la devolucion
 * van juntos en una transaccion.
 *
 * Tambien deshace el otro efecto de finalizar: la orden de trabajo que habia quedado
 * "lista" regresa a "en proceso" (nunca una ya entregada o cancelada).
 *
 * Si el reporte ya genero factura, NO bloquea: reabrir un reporte no anula nada en
 * facturacion, y quien reabre necesita enterarse para ir a corregir la factura por su
 * lado. Eso y el cambio de estado de la orden se devuelven en `notices`, para que el
 * frontend le muestre al usuario todo lo que se movio al reabrir.
 */
export async function reopen(id, userId = null) {
  const report = await workReportRepository.findById(id);
  if (!report) throw new ApiError(404, 'Reporte de trabajo no encontrado');
  if (report.status !== 'finalizado') {
    throw new ApiError(409, 'El reporte no esta finalizado');
  }

  const { updated, stockWarnings, orderReopened } = await withTransaction(async (conn) => {
    // Mismo candado que en finalize, y por lo mismo: dos "Reabrir" a la vez leerian ambos
    // que hay material pendiente de devolver y lo repondrian dos veces. El segundo entra
    // cuando el primero ya confirmo, ve el reporte en borrador y no mueve nada.
    const locked = await workReportRepository.lockById(id, conn);
    if (!locked) throw new ApiError(404, 'Reporte de trabajo no encontrado');
    if (locked.status !== 'finalizado') {
      throw new ApiError(409, 'El reporte no esta finalizado');
    }

    const saved = await workReportRepository.update(id, {
      status: 'en_progreso',
      finalized_at: null,
    }, conn);
    const { warnings } = await inventoryService.syncConsumption({
      referenceType: 'work_report',
      referenceId: Number(id),
      items: [],
      userId,
      conn,
    });

    // La orden de trabajo que este reporte habia dejado "lista" vuelve a "en proceso": el
    // trabajo se reabrio, asi que la orden no puede seguir figurando como terminada. Solo
    // ese paso -- una orden ya entregada o cancelada no se toca (la condicion vive en el
    // WHERE de setInProgressIfReady). Un reporte de Orden de Servicio no tiene orden de
    // trabajo detras, y en ese caso no hay nada que hacer.
    const backToInProgress = report.work_order_id
      ? await workOrderRepository.setInProgressIfReady(report.work_order_id, conn)
      : false;

    return { updated: saved, stockWarnings: warnings, orderReopened: backToInProgress };
  });

  const notices = [];
  // Se avisa del cambio de estado de la orden porque el usuario no lo pidio: presiono
  // "Reabrir" sobre el reporte y de paso se le movio la orden. Un cambio de estado
  // silencioso es justo lo que despues nadie sabe explicar.
  if (orderReopened) {
    notices.push(`La orden de trabajo No. ${updated.order_number} volvio a "en proceso".`);
  }
  const invoice = updated.work_order_id
    ? await invoiceService.getByWorkOrderId(updated.work_order_id)
    : null;
  if (invoice) {
    notices.push(
      `Este reporte ya genero la factura No. ${invoice.number}, que NO se anula al reabrirlo. ` +
      'Si el trabajo cambia, hay que corregir la factura por separado en Facturacion.'
    );
  }
  return { report: updated, notices, stock_warnings: stockWarnings };
}

// Elimina un reporte de trabajo.
export async function remove(id) {
  const existing = await workReportRepository.findById(id);
  if (!existing) throw new ApiError(404, 'Reporte de trabajo no encontrado');
  return workReportRepository.remove(id);
}
