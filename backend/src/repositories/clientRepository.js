import pool from '../lib/db.js';

const SELECT = `
  SELECT c.*,
    CASE
      WHEN c.last_name IS NOT NULL AND c.last_name != ''
        THEN CONCAT(c.first_name, ' ', c.last_name)
      ELSE c.first_name
    END as full_name,
    ct.name as client_type_name,
    lt.name as loyalty_tier_name,
    lt.discount as loyalty_discount
  FROM clients c
  LEFT JOIN client_types ct ON c.client_type_id = ct.id
  LEFT JOIN loyalty_tiers lt ON c.loyalty_tier_id = lt.id
`;

export async function getAll() {
  const [rows] = await pool.query(SELECT + ' ORDER BY c.created_at DESC');
  return rows;
}

export async function findById(id) {
  const [rows] = await pool.query(SELECT + ' WHERE c.id = ?', [id]);
  return rows[0] || null;
}

export async function create(data) {
  const fields = Object.keys(data).join(', ');
  const placeholders = Object.keys(data).map(() => '?').join(', ');
  const [result] = await pool.query('INSERT INTO clients (' + fields + ') VALUES (' + placeholders + ')', Object.values(data));
  return findById(result.insertId);
}

export async function update(id, patch) {
  const fields = Object.keys(patch).map(k => k + ' = ?').join(', ');
  await pool.query('UPDATE clients SET ' + fields + ' WHERE id = ?', [...Object.values(patch), id]);
  return findById(id);
}

export async function remove(id) {
  const [result] = await pool.query('DELETE FROM clients WHERE id = ?', [id]);
  return result.affectedRows > 0;
}
