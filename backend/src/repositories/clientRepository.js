// Este archivo guarda y consulta los CLIENTES del taller: su nombre, teléfono, NIT/DPI,
// dirección, tipo de cliente y nivel de fidelización.
import pool from '../lib/db.js';

// Consulta base reutilizada por getAll y findById: además de los datos del cliente,
// arma su "nombre completo" (nombre + apellido, o solo el nombre si no tiene apellido)
// y trae el nombre de su tipo de cliente y de su nivel de fidelización (con el descuento
// que le corresponde), para no tener que buscarlos aparte cada vez.
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

// Trae todos los clientes, del más reciente al más antiguo.
export async function getAll() {
  const [rows] = await pool.query(SELECT + ' ORDER BY c.created_at DESC');
  return rows;
}

// Busca un cliente por su id. Si no existe, devuelve null.
export async function findById(id) {
  const [rows] = await pool.query(SELECT + ' WHERE c.id = ?', [id]);
  return rows[0] || null;
}

// Guarda un nuevo cliente en la base de datos y devuelve el registro ya creado.
export async function create(data) {
  const fields = Object.keys(data).join(', ');
  const placeholders = Object.keys(data).map(() => '?').join(', ');
  const [result] = await pool.query('INSERT INTO clients (' + fields + ') VALUES (' + placeholders + ')', Object.values(data));
  return findById(result.insertId);
}

// Actualiza solo los datos indicados (patch) de un cliente existente.
export async function update(id, patch) {
  const fields = Object.keys(patch).map(k => k + ' = ?').join(', ');
  await pool.query('UPDATE clients SET ' + fields + ' WHERE id = ?', [...Object.values(patch), id]);
  return findById(id);
}

// Elimina un cliente. Devuelve true si sí se borró algo, false si no existía.
export async function remove(id) {
  const [result] = await pool.query('DELETE FROM clients WHERE id = ?', [id]);
  return result.affectedRows > 0;
}
