// Este archivo guarda y consulta las ÓRDENES DE SERVICIO: trabajos que el taller manda
// a hacer AFUERA con un subcontratista externo (ej. torneado). A diferencia de una Orden
// de Trabajo (interna), esta SÍ muestra precios (costo acordado/real) — es informacion
// administrativa para Abdías, no para tecnicos.
import pool from '../lib/db.js';

// Trae todas las órdenes de servicio, la más reciente primero, junto con el nombre del
// subcontratista y del cliente (si tiene), para no tener que buscarlos aparte.
export async function getAll() {
  const [rows] = await pool.query(`
    SELECT so.*, s.name as subcontractor_name,
      CASE
        WHEN c.last_name IS NOT NULL AND c.last_name != ''
          THEN CONCAT(c.first_name, ' ', c.last_name)
        ELSE c.first_name
      END as client_name
    FROM service_orders so
    JOIN subcontractors s ON so.subcontractor_id = s.id
    LEFT JOIN clients c ON so.client_id = c.id
    ORDER BY so.created_at DESC
  `);
  return rows;
}

// Busca una orden de servicio por su id, con el nombre del subcontratista y del cliente.
// Si no existe, devuelve null.
export async function findById(id) {
  const [[order]] = await pool.query(`
    SELECT so.*, s.name as subcontractor_name,
      CASE
        WHEN c.last_name IS NOT NULL AND c.last_name != ''
          THEN CONCAT(c.first_name, ' ', c.last_name)
        ELSE c.first_name
      END as client_name
    FROM service_orders so
    JOIN subcontractors s ON so.subcontractor_id = s.id
    LEFT JOIN clients c ON so.client_id = c.id
    WHERE so.id = ?
  `, [id]);
  return order || null;
}

// Calcula el siguiente número correlativo de orden de servicio (busca el número más alto
// ya usado y le suma 1), relleno con ceros a la izquierda hasta 4 dígitos.
export async function getNextNumber() {
  const [[row]] = await pool.query('SELECT MAX(CAST(number AS UNSIGNED)) as max_num FROM service_orders');
  return String(row.max_num ? row.max_num + 1 : 1).padStart(4, '0');
}

// Guarda una nueva orden de servicio.
export async function create(data) {
  const fields = Object.keys(data).join(', ');
  const placeholders = Object.keys(data).map(() => '?').join(', ');
  const [result] = await pool.query(
    `INSERT INTO service_orders (${fields}) VALUES (${placeholders})`,
    Object.values(data)
  );
  return findById(result.insertId);
}

// Actualiza una orden de servicio existente.
export async function update(id, data) {
  if (Object.keys(data).length > 0) {
    const fields = Object.keys(data).map(k => k + ' = ?').join(', ');
    await pool.query(`UPDATE service_orders SET ${fields} WHERE id = ?`, [...Object.values(data), id]);
  }
  return findById(id);
}

// Elimina una orden de servicio. Devuelve true si sí se borró algo, false si no existía.
export async function remove(id) {
  const [result] = await pool.query('DELETE FROM service_orders WHERE id = ?', [id]);
  return result.affectedRows > 0;
}
