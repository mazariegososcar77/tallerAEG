// Este archivo guarda y consulta los CLIENTES del taller: su nombre, teléfono, NIT/DPI,
// dirección, tipo de cliente y nivel de fidelización.
import pool from '../lib/db.js';

// Consulta base reutilizada por getAll y findById: además de los datos del cliente,
// arma su "nombre completo" (nombre + apellido, o solo el nombre si no tiene apellido),
// trae el nombre de su tipo de cliente y de su nivel de fidelización (con el descuento
// que le corresponde), y sus contactos (correo + nombre de quien lo usa, ver
// client_contacts) como un arreglo JSON -- todo en una sola consulta, para no tener
// que buscar nada de esto aparte ni caer en un problema de "N+1 consultas" al listar
// muchos clientes.
const SELECT = `
  SELECT c.*,
    CASE
      WHEN c.last_name IS NOT NULL AND c.last_name != ''
        THEN CONCAT(c.first_name, ' ', c.last_name)
      ELSE c.first_name
    END as full_name,
    ct.name as client_type_name,
    lt.name as loyalty_tier_name,
    lt.discount as loyalty_discount,
    (
      SELECT JSON_ARRAYAGG(JSON_OBJECT('id', cc.id, 'email', cc.email, 'name', cc.name))
      FROM client_contacts cc WHERE cc.client_id = c.id
    ) as contacts_json
  FROM clients c
  LEFT JOIN client_types ct ON c.client_type_id = ct.id
  LEFT JOIN loyalty_tiers lt ON c.loyalty_tier_id = lt.id
`;

// Reemplaza `contacts_json` (el JSON crudo que devuelve MySQL, o null si el cliente
// no tiene contactos) por `contacts`, un arreglo normal ya parseado.
function withContacts(row) {
  if (!row) return row;
  const { contacts_json, ...rest } = row;
  rest.contacts = typeof contacts_json === 'string' ? JSON.parse(contacts_json) : (contacts_json || []);
  return rest;
}

// Trae todos los clientes, del más reciente al más antiguo.
export async function getAll() {
  const [rows] = await pool.query(SELECT + ' ORDER BY c.created_at DESC');
  return rows.map(withContacts);
}

// Busca un cliente por su id. Si no existe, devuelve null.
export async function findById(id) {
  const [rows] = await pool.query(SELECT + ' WHERE c.id = ?', [id]);
  return withContacts(rows[0]) || null;
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

// Busca otro cliente con el mismo NIT, sin importar guiones ni espacios ("1234567-8" = "12345678").
// `excludeId` deja fuera al propio cliente cuando se esta editando. Devuelve { id, first_name, last_name } o null.
export async function findByNit(nit, excludeId = null) {
  const [rows] = await pool.query(
    "SELECT id, first_name, last_name FROM clients WHERE UPPER(REPLACE(REPLACE(nit, '-', ''), ' ', '')) = ? AND id <> ? LIMIT 1",
    [String(nit).toUpperCase(), excludeId ?? 0],
  );
  return rows[0] || null;
}

// Igual que findByNit, para el DPI.
export async function findByDpi(dpi, excludeId = null) {
  const [rows] = await pool.query(
    "SELECT id, first_name, last_name FROM clients WHERE REPLACE(REPLACE(dpi, '-', ''), ' ', '') = ? AND id <> ? LIMIT 1",
    [String(dpi), excludeId ?? 0],
  );
  return rows[0] || null;
}
