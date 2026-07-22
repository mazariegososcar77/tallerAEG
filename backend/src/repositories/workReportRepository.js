import pool from '../lib/db.js';

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

export async function findByWorkOrderId(workOrderId) {
  const [[row]] = await pool.query('SELECT id FROM work_reports WHERE work_order_id = ?', [workOrderId]);
  return row ? findById(row.id) : null;
}

export async function getNextNumber() {
  const [[row]] = await pool.query('SELECT MAX(CAST(number AS UNSIGNED)) as max_num FROM work_reports');
  return String(row.max_num ? row.max_num + 1 : 1).padStart(4, '0');
}

export async function create(data) {
  const fields = Object.keys(data).join(', ');
  const placeholders = Object.keys(data).map(() => '?').join(', ');
  const [result] = await pool.query(
    `INSERT INTO work_reports (${fields}) VALUES (${placeholders})`,
    Object.values(data)
  );
  return findById(result.insertId);
}

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

export async function remove(id) {
  const [result] = await pool.query('DELETE FROM work_reports WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

export async function addPhoto(reportId, { stage, photo_url, caption, sort_order }) {
  const [result] = await pool.query(
    'INSERT INTO work_report_photos (work_report_id, stage, photo_url, caption, sort_order) VALUES (?, ?, ?, ?, ?)',
    [reportId, stage, photo_url, caption || null, sort_order || 0]
  );
  const [[photo]] = await pool.query('SELECT * FROM work_report_photos WHERE id = ?', [result.insertId]);
  return photo;
}

export async function findPhotoById(photoId) {
  const [[photo]] = await pool.query('SELECT * FROM work_report_photos WHERE id = ?', [photoId]);
  return photo || null;
}

export async function removePhoto(photoId) {
  const [result] = await pool.query('DELETE FROM work_report_photos WHERE id = ?', [photoId]);
  return result.affectedRows > 0;
}
