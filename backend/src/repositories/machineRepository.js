// Este archivo guarda y consulta las MÁQUINAS (equipos) que son propiedad de un cliente:
// marca, modelo, serie y demás datos técnicos. Cada máquina pertenece a un cliente.
import pool from '../lib/db.js';

// Consulta base reutilizada por getAll y findById: trae también el nombre del cliente
// dueño de la máquina, para no tener que buscarlo aparte.
const SELECT = `
  SELECT m.*, c.first_name as client_name
  FROM machines m
  LEFT JOIN clients c ON m.client_id = c.id
`;

// Trae la lista de máquinas. Si se indica un clientId, solo trae las de ese cliente
// (ordenadas por nombre); si no, trae todas ordenadas por cliente y luego por nombre.
export async function getAll(clientId) {
  if (clientId) {
    const [rows] = await pool.query(SELECT + ' WHERE m.client_id = ? ORDER BY m.name', [clientId]);
    return rows;
  }
  const [rows] = await pool.query(SELECT + ' ORDER BY c.first_name, m.name');
  return rows;
}

// Busca una máquina por su id. Si no existe, devuelve null.
export async function findById(id) {
  const [rows] = await pool.query(SELECT + ' WHERE m.id = ?', [id]);
  return rows[0] || null;
}

// Guarda una nueva máquina en la base de datos y devuelve el registro ya creado.
export async function create(data) {
  const fields = Object.keys(data).join(', ');
  const placeholders = Object.keys(data).map(() => '?').join(', ');
  const [result] = await pool.query('INSERT INTO machines (' + fields + ') VALUES (' + placeholders + ')', Object.values(data));
  return findById(result.insertId);
}

// Actualiza solo los datos indicados (patch) de una máquina existente.
export async function update(id, patch) {
  const fields = Object.keys(patch).map(k => k + ' = ?').join(', ');
  await pool.query('UPDATE machines SET ' + fields + ' WHERE id = ?', [...Object.values(patch), id]);
  return findById(id);
}

// Elimina una máquina. Devuelve true si sí se borró algo, false si no existía.
export async function remove(id) {
  const [result] = await pool.query('DELETE FROM machines WHERE id = ?', [id]);
  return result.affectedRows > 0;
}
