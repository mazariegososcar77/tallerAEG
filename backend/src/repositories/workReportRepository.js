// Este archivo guarda y consulta los REPORTES DE TRABAJO: la documentación fotográfica de
// una orden (de Trabajo o de Servicio) en sus 4 etapas (antes de desarmar, desarmado,
// piezas instaladas, armado final), con sus fotos (work_report_photos) y notas por etapa.
//
// Un reporte documenta EXACTAMENTE una de dos cosas (nunca ambas): una Orden de Trabajo
// (work_order_id, flujo interno Pre/Post) o una Orden de Servicio (service_order_id, visita
// tecnica de campo). Para no repetir logica condicional en cada consumidor, las consultas
// de aqui devuelven campos ya unificados (order_number/order_kind/client_name/
// equipment_name/brand/model) resueltos con COALESCE segun cual de los dos aplique.
import pool from '../lib/db.js';

// Piezas de SELECT/JOIN compartidas entre getAll y findById.
const UNIFIED_SELECT = `
  wr.*,
  COALESCE(wo.number, so.number) as order_number,
  CASE WHEN wr.work_order_id IS NOT NULL THEN 'work_order' ELSE 'service_order' END as order_kind,
  -- Flujo (Pre/Post) de la orden que documenta este reporte, para que la lista pueda
  -- separarlos igual que la pantalla de Ordenes de Trabajo. Viene NULL en los reportes
  -- de Orden de Servicio, que no pertenecen a ninguno de los dos flujos.
  wo.flow_type,
  COALESCE(wo.number, so.number) as work_order_number,
  COALESCE(wo.equipment_name, so.equipment_name) as equipment_name,
  COALESCE(wo.brand, so.brand) as brand,
  COALESCE(wo.model, so.model) as model,
  COALESCE(
    CASE WHEN c.last_name IS NOT NULL AND c.last_name != '' THEN CONCAT(c.first_name, ' ', c.last_name) ELSE c.first_name END,
    CASE WHEN sc.last_name IS NOT NULL AND sc.last_name != '' THEN CONCAT(sc.first_name, ' ', sc.last_name) ELSE sc.first_name END
  ) as client_name
`;
const UNIFIED_JOIN = `
  LEFT JOIN work_orders wo ON wr.work_order_id = wo.id
  LEFT JOIN clients c ON wo.client_id = c.id
  LEFT JOIN service_orders so ON wr.service_order_id = so.id
  LEFT JOIN clients sc ON so.client_id = sc.id
`;

// Trae todos los reportes de trabajo, el más reciente primero, con el numero de su orden
// (de Trabajo o de Servicio, cual aplique) y el nombre del cliente o del subcontratista.
export async function getAll() {
  const [rows] = await pool.query(`
    SELECT ${UNIFIED_SELECT}
    FROM work_reports wr
    ${UNIFIED_JOIN}
    ORDER BY wr.created_at DESC
  `);
  return rows;
}

// Busca un reporte de trabajo por su id, junto con los datos unificados del equipo/cliente
// (ver arriba), y le agrega su lista de fotos (ordenadas por etapa) y sus notas por etapa
// (que se guardan como texto y aquí se convierten de vuelta a un objeto usable). Si no
// existe, devuelve null.
// El `executor` opcional es el pool para una consulta suelta, o la conexión (`conn`)
// cuando se está dentro de una transacción — si no se le pasa la conexión, la consulta
// va por fuera y no ve los cambios que la transacción todavía no ha confirmado.
export async function findById(id, executor = pool) {
  const [[report]] = await executor.query(`
    SELECT ${UNIFIED_SELECT}
    FROM work_reports wr
    ${UNIFIED_JOIN}
    WHERE wr.id = ?
  `, [id]);
  if (!report) return null;
  const [photos] = await executor.query(
    'SELECT * FROM work_report_photos WHERE work_report_id = ? ORDER BY stage, sort_order, id',
    [id]
  );
  report.photos = photos;
  if (report.stage_notes && typeof report.stage_notes === 'string') {
    report.stage_notes = JSON.parse(report.stage_notes);
  }
  return report;
}

/**
 * Lee el estado de un reporte dejando su fila BLOQUEADA hasta que termine la transacción
 * (`FOR UPDATE`). Solo tiene sentido dentro de una transacción: hay que pasarle su conexión.
 *
 * Es el candado que serializa todo lo que mueve inventario a nombre de este reporte. Sin él,
 * dos "Finalizar" simultáneos (un doble clic, un reintento del navegador) alcanzan a leer los
 * dos que el reporte todavía no tiene material descargado — cada uno calcula su descuento
 * contra ese mismo panorama — y el material termina saliendo de bodega dos veces. Con el
 * candado, el segundo espera, entra cuando el primero ya confirmó, ve el reporte finalizado
 * y no descuenta nada.
 *
 * Devuelve solo id y status (es lo único que se necesita para decidir): quien quiera el
 * reporte completo usa findById.
 */
export async function lockById(id, executor) {
  const [rows] = await executor.query('SELECT id, status FROM work_reports WHERE id = ? FOR UPDATE', [id]);
  return rows[0] || null;
}

// Busca el reporte de trabajo que corresponde a una orden de trabajo (cada orden tiene
// como máximo un reporte). Si no tiene, devuelve null.
export async function findByWorkOrderId(workOrderId) {
  const [[row]] = await pool.query('SELECT id FROM work_reports WHERE work_order_id = ?', [workOrderId]);
  return row ? findById(row.id) : null;
}

// Igual que findByWorkOrderId, pero para una orden de servicio (subcontrato).
export async function findByServiceOrderId(serviceOrderId) {
  const [[row]] = await pool.query('SELECT id FROM work_reports WHERE service_order_id = ?', [serviceOrderId]);
  return row ? findById(row.id) : null;
}

// Busca el reporte que corresponde a un token de enlace publico de firma
// remota (ver 027_work_reports_signing_link.sql). Si no existe ese token,
// devuelve null.
export async function findByPublicToken(token) {
  const [[row]] = await pool.query('SELECT id FROM work_reports WHERE client_signature_token = ?', [token]);
  return row ? findById(row.id) : null;
}

// Calcula el siguiente número correlativo de reporte de trabajo (busca el número más alto
// ya usado y le suma 1), relleno con ceros a la izquierda hasta 4 dígitos.
export async function getNextNumber() {
  const [[row]] = await pool.query('SELECT MAX(CAST(number AS UNSIGNED)) as max_num FROM work_reports');
  return String(row.max_num ? row.max_num + 1 : 1).padStart(4, '0');
}

// Guarda un nuevo reporte de trabajo (todavía sin fotos; las fotos se agregan después con addPhoto).
export async function create(data) {
  const fields = Object.keys(data).join(', ');
  const placeholders = Object.keys(data).map(() => '?').join(', ');
  const [result] = await pool.query(
    `INSERT INTO work_reports (${fields}) VALUES (${placeholders})`,
    Object.values(data)
  );
  return findById(result.insertId);
}

// Actualiza un reporte de trabajo existente (por ejemplo, sus notas o su estado). Las
// notas por etapa se convierten a texto antes de guardarlas, porque así se almacenan en
// la base de datos.
export async function update(id, data, executor = pool) {
  if (data.stage_notes && typeof data.stage_notes !== 'string') {
    data.stage_notes = JSON.stringify(data.stage_notes);
  }
  if (Object.keys(data).length > 0) {
    const fields = Object.keys(data).map((k) => k + ' = ?').join(', ');
    await executor.query(`UPDATE work_reports SET ${fields} WHERE id = ?`, [...Object.values(data), id]);
  }
  return findById(id, executor);
}

// Elimina un reporte de trabajo. Devuelve true si sí se borró algo, false si no existía.
export async function remove(id) {
  const [result] = await pool.query('DELETE FROM work_reports WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

// Agrega una foto a un reporte, indicando a qué etapa pertenece, su descripción (caption)
// y el orden en que debe mostrarse dentro de esa etapa.
export async function addPhoto(reportId, { stage, photo_url, caption, sort_order }) {
  const [result] = await pool.query(
    'INSERT INTO work_report_photos (work_report_id, stage, photo_url, caption, sort_order) VALUES (?, ?, ?, ?, ?)',
    [reportId, stage, photo_url, caption || null, sort_order || 0]
  );
  const [[photo]] = await pool.query('SELECT * FROM work_report_photos WHERE id = ?', [result.insertId]);
  return photo;
}

// Busca una foto de reporte por su id. Si no existe, devuelve null.
export async function findPhotoById(photoId) {
  const [[photo]] = await pool.query('SELECT * FROM work_report_photos WHERE id = ?', [photoId]);
  return photo || null;
}

// Elimina una foto de un reporte. Devuelve true si sí se borró algo, false si no existía.
export async function removePhoto(photoId) {
  const [result] = await pool.query('DELETE FROM work_report_photos WHERE id = ?', [photoId]);
  return result.affectedRows > 0;
}
