// Este archivo guarda y consulta los SUB-PROYECTOS de un cliente: la forma de distinguir,
// bajo un mismo cliente (un NIT), varios proyectos/sucursales (ej. "Burger King Amatitlan",
// "Burger King Zona 10") sin tener que crear un cliente nuevo por cada uno.
import pool from '../lib/db.js';
import { pickColumns } from '../lib/tableColumns.js';

// Trae los sub-proyectos activos de un cliente, ordenados por nombre.
export async function getActiveByClient(clientId) {
  const [rows] = await pool.query(
    'SELECT * FROM client_projects WHERE client_id = ? AND is_active = 1 ORDER BY name',
    [clientId],
  );
  return rows;
}

export async function findById(id) {
  const [rows] = await pool.query('SELECT * FROM client_projects WHERE id = ?', [id]);
  return rows[0] || null;
}

// Busca otro sub-proyecto del mismo cliente con el mismo nombre (sin distinguir mayusculas),
// para avisar con un mensaje claro en vez de que falle por la restriccion UNIQUE de la tabla.
export async function findByName(clientId, name, excludeId = null) {
  const [rows] = await pool.query(
    'SELECT id, name FROM client_projects WHERE client_id = ? AND UPPER(name) = UPPER(?) AND id <> ? LIMIT 1',
    [clientId, name, excludeId ?? 0],
  );
  return rows[0] || null;
}

export async function create(data) {
  data = await pickColumns('client_projects', data);
  const fields = Object.keys(data).join(', ');
  const placeholders = Object.keys(data).map(() => '?').join(', ');
  const [result] = await pool.query(
    'INSERT INTO client_projects (' + fields + ') VALUES (' + placeholders + ')',
    Object.values(data),
  );
  return findById(result.insertId);
}

export async function update(id, patch) {
  patch = await pickColumns('client_projects', patch);
  const fields = Object.keys(patch).map((k) => k + ' = ?').join(', ');
  await pool.query('UPDATE client_projects SET ' + fields + ' WHERE id = ?', [...Object.values(patch), id]);
  return findById(id);
}
