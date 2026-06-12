import pool from '../lib/db.js';

const SELECT = `
  SELECT m.*, c.first_name as client_name
  FROM machines m
  LEFT JOIN clients c ON m.client_id = c.id
`;

export async function getAll(clientId) {
  if (clientId) {
    const [rows] = await pool.query(SELECT + ' WHERE m.client_id = ? ORDER BY m.name', [clientId]);
    return rows;
  }
  const [rows] = await pool.query(SELECT + ' ORDER BY c.first_name, m.name');
  return rows;
}

export async function findById(id) {
  const [rows] = await pool.query(SELECT + ' WHERE m.id = ?', [id]);
  return rows[0] || null;
}

export async function create(data) {
  const fields = Object.keys(data).join(', ');
  const placeholders = Object.keys(data).map(() => '?').join(', ');
  const [result] = await pool.query('INSERT INTO machines (' + fields + ') VALUES (' + placeholders + ')', Object.values(data));
  return findById(result.insertId);
}

export async function update(id, patch) {
  const fields = Object.keys(patch).map(k => k + ' = ?').join(', ');
  await pool.query('UPDATE machines SET ' + fields + ' WHERE id = ?', [...Object.values(patch), id]);
  return findById(id);
}

export async function remove(id) {
  const [result] = await pool.query('DELETE FROM machines WHERE id = ?', [id]);
  return result.affectedRows > 0;
}
