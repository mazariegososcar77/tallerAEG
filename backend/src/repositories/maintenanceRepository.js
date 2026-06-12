import pool from '../lib/db.js';

const FREQ_DAYS = { mensual: 30, trimestral: 90, semestral: 180, anual: 365 };

function calcStatus(nextService) {
  if (!nextService) return 'al_dia';
  const today = new Date();
  const next = new Date(nextService);
  const diffDays = Math.ceil((next - today) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return 'vencido';
  if (diffDays <= 30) return 'proximo';
  return 'al_dia';
}

function calcNextService(lastService, frequency, frequencyDays) {
  if (!lastService) return null;
  const days = frequency === 'personalizado' ? frequencyDays : FREQ_DAYS[frequency];
  if (!days) return null;
  const last = new Date(lastService);
  last.setDate(last.getDate() + days);
  return last.toISOString().slice(0, 10);
}

const SELECT = `
  SELECT ms.*,
    m.name as machine_name, m.brand as machine_brand, m.serial as machine_serial,
    c.first_name as client_name
  FROM maintenance_schedules ms
  LEFT JOIN machines m ON ms.machine_id = m.id
  LEFT JOIN clients c ON ms.client_id = c.id
`;

export async function getAll(clientId) {
  if (clientId) {
    const [rows] = await pool.query(SELECT + ' WHERE ms.client_id = ? ORDER BY ms.next_service ASC', [clientId]);
    return rows;
  }
  const [rows] = await pool.query(SELECT + ' ORDER BY ms.next_service ASC');
  return rows;
}

export async function findById(id) {
  const [rows] = await pool.query(SELECT + ' WHERE ms.id = ?', [id]);
  return rows[0] || null;
}

export async function create(data) {
  const next = calcNextService(data.last_service, data.frequency, data.frequency_days);
  const status = calcStatus(next);
  const payload = { ...data, next_service: next, status };
  const fields = Object.keys(payload).join(', ');
  const placeholders = Object.keys(payload).map(() => '?').join(', ');
  const [result] = await pool.query('INSERT INTO maintenance_schedules (' + fields + ') VALUES (' + placeholders + ')', Object.values(payload));
  return findById(result.insertId);
}

export async function update(id, patch) {
  const existing = await findById(id);
  const merged = { ...existing, ...patch };
  const next = calcNextService(merged.last_service, merged.frequency, merged.frequency_days);
  const status = calcStatus(next);
  const fullPatch = { ...patch, next_service: next, status };
  const fields = Object.keys(fullPatch).map(k => k + ' = ?').join(', ');
  await pool.query('UPDATE maintenance_schedules SET ' + fields + ' WHERE id = ?', [...Object.values(fullPatch), id]);
  return findById(id);
}

export async function remove(id) {
  const [result] = await pool.query('DELETE FROM maintenance_schedules WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

export async function getUpcoming(days = 30) {
  const [rows] = await pool.query(SELECT + ` WHERE ms.next_service <= DATE_ADD(CURDATE(), INTERVAL ? DAY) AND ms.is_active = 1 ORDER BY ms.next_service ASC`, [days]);
  return rows;
}
