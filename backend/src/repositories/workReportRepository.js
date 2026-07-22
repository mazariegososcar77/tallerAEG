// Este archivo guarda y consulta los REPORTES DE TRABAJO: la documentación fotográfica de
// una orden de trabajo en sus 4 etapas (antes de desarmar, desarmado, piezas instaladas,
// armado final), con sus fotos (work_report_photos) y notas por etapa.
import pool from '../lib/db.js';

// Trae todos los reportes de trabajo, el más reciente primero, junto con el número de la
// orden de trabajo y el nombre del cliente, para no tener que buscarlos aparte.
export async function getAll() {
  const [rows] = await pool.query(`
    SELECT wr.*, wo.number as work_order_number,
      CASE
        WHEN c.last_name IS NOT NULL AND c.last_name != ''
          THEN CONCAT(c.first_name, ' ', c.last_name)
        ELSE c.first_name
      END as client_name
    FROM work_reports wr
    JOIN work_orders wo ON wr.work_order_id = wo.id
    LEFT JOIN clients c ON wo.client_id = c.id
    ORDER BY wr.created_at DESC
  `);
  return rows;
}

// Busca un reporte de trabajo por su id, junto con datos del equipo y del cliente, y le
// agrega su lista de fotos (ordenadas por etapa) y sus notas por etapa (que se guardan
// como texto y aquí se convierten de vuelta a un objeto usable). Si no existe, devuelve null.
export async function findById(id) {
  const [[report]] = await pool.query(`
    SELECT wr.*, wo.number as work_order_number, wo.equipment_name, wo.brand, wo.model,
      CASE
        WHEN c.last_name IS NOT NULL AND c.last_name != ''
          THEN CONCAT(c.first_name, ' ', c.last_name)
        ELSE c.first_name
      END as client_name
    FROM work_reports wr
    JOIN work_orders wo ON wr.work_order_id = wo.id
    LEFT JOIN clients c ON wo.client_id = c.id
    WHERE wr.id = ?
  `, [id]);
  if (!report) return null;
  const [photos] = await pool.query(
    'SELECT * FROM work_report_photos WHERE work_report_id = ? ORDER BY stage, sort_order, id',
    [id]
  );
  report.photos = photos;
  if (report.stage_notes && typeof report.stage_notes === 'string') {
    report.stage_notes = JSON.parse(report.stage_notes);
  }
  return report;
}

// Busca el reporte de trabajo que corresponde a una orden de trabajo (cada orden tiene
// como máximo un reporte). Si no tiene, devuelve null.
export async function findByWorkOrderId(workOrderId) {
  const [[row]] = await pool.query('SELECT id FROM work_reports WHERE work_order_id = ?', [workOrderId]);
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
export async function update(id, data) {
  if (data.stage_notes && typeof data.stage_notes !== 'string') {
    data.stage_notes = JSON.stringify(data.stage_notes);
  }
  if (Object.keys(data).length > 0) {
    const fields = Object.keys(data).map((k) => k + ' = ?').join(', ');
    await pool.query(`UPDATE work_reports SET ${fields} WHERE id = ?`, [...Object.values(data), id]);
  }
  return findById(id);
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
