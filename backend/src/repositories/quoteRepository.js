// Este archivo guarda y consulta las COTIZACIONES del taller: los presupuestos que se le
// dan a un cliente antes de trabajar en su equipo, con sus líneas de mano de obra/piezas
// (quote_items) y los datos de cada equipo cotizado (equipment_data).
import pool from '../lib/db.js';

// Trae todas las cotizaciones, la más reciente primero, junto con el nombre del cliente
// (armado a partir de nombre y apellido), para no tener que buscarlo aparte.
export async function getAll() {
  const [rows] = await pool.query(`
    SELECT q.*,
      CASE
        WHEN c.last_name IS NOT NULL AND c.last_name != ''
          THEN CONCAT(c.first_name, ' ', c.last_name)
        ELSE c.first_name
      END as client_name
    FROM quotes q
    LEFT JOIN clients c ON q.client_id = c.id
    ORDER BY q.created_at DESC
  `);
  return rows;
}

// Busca una cotización por su id, con el nombre del cliente y además le agrega su lista
// de líneas (quote_items) y convierte el detalle de los equipos cotizados (equipment_data,
// que se guarda como texto) de vuelta a un objeto usable. Si no existe, devuelve null.
export async function findById(id) {
  const [[quote]] = await pool.query(`
    SELECT q.*,
      CASE
        WHEN c.last_name IS NOT NULL AND c.last_name != ''
          THEN CONCAT(c.first_name, ' ', c.last_name)
        ELSE c.first_name
      END as client_name
    FROM quotes q
    LEFT JOIN clients c ON q.client_id = c.id
    WHERE q.id = ?
  `, [id]);
  if (!quote) return null;
  const [items] = await pool.query(
    'SELECT * FROM quote_items WHERE quote_id = ? ORDER BY equipment_index, item_type, id',
    [id]
  );
  quote.items = items;
  if (quote.equipment_data && typeof quote.equipment_data === 'string') {
    quote.equipment_data = JSON.parse(quote.equipment_data);
  }
  return quote;
}

// Calcula el siguiente número correlativo de cotización (busca el número más alto ya
// usado y le suma 1), relleno con ceros a la izquierda hasta 4 dígitos.
export async function getNextNumber() {
  const [[row]] = await pool.query('SELECT MAX(CAST(number AS UNSIGNED)) as max_num FROM quotes');
  return String(row.max_num ? row.max_num + 1 : 1).padStart(4, '0');
}

// Guarda una nueva cotización junto con todas sus líneas (quote_items). Todo se hace como
// una sola operación (transacción): si algo falla a mitad de camino, se deshace todo para
// no dejar una cotización a medio guardar.
export async function create(data, items = []) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    if (data.equipment_data && typeof data.equipment_data !== 'string') {
      data.equipment_data = JSON.stringify(data.equipment_data);
    }
    const fields = Object.keys(data).join(', ');
    const placeholders = Object.keys(data).map(() => '?').join(', ');
    const [result] = await conn.query(
      `INSERT INTO quotes (${fields}) VALUES (${placeholders})`,
      Object.values(data)
    );
    const quoteId = result.insertId;
    for (const item of items) {
      const subtotal = (parseFloat(item.quantity) || 1) * (parseFloat(item.unit_price) || 0);
      await conn.query(
        'INSERT INTO quote_items (quote_id, equipment_index, item_type, description, quantity, unit_price, subtotal) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [quoteId, item.equipment_index ?? 0, item.item_type ?? 'labor', item.description, item.quantity || 1, item.unit_price || 0, subtotal]
      );
    }
    await conn.commit();
    return findById(quoteId);
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

// Actualiza una cotización existente. Si vienen líneas nuevas (items), primero borra
// todas las líneas anteriores y guarda las nuevas en su lugar (así siempre queda la
// lista completa y correcta). Todo se hace como una sola operación (transacción).
export async function update(id, data, items) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    if (data.equipment_data && typeof data.equipment_data !== 'string') {
      data.equipment_data = JSON.stringify(data.equipment_data);
    }
    if (Object.keys(data).length > 0) {
      const fields = Object.keys(data).map(k => k + ' = ?').join(', ');
      await conn.query(`UPDATE quotes SET ${fields} WHERE id = ?`, [...Object.values(data), id]);
    }
    if (items !== undefined) {
      await conn.query('DELETE FROM quote_items WHERE quote_id = ?', [id]);
      for (const item of items) {
        const subtotal = (parseFloat(item.quantity) || 1) * (parseFloat(item.unit_price) || 0);
        await conn.query(
          'INSERT INTO quote_items (quote_id, equipment_index, item_type, description, quantity, unit_price, subtotal) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [id, item.equipment_index ?? 0, item.item_type ?? 'labor', item.description, item.quantity || 1, item.unit_price || 0, subtotal]
        );
      }
    }
    await conn.commit();
    return findById(id);
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

// Elimina una cotización. Devuelve true si sí se borró algo, false si no existía.
export async function remove(id) {
  const [result] = await pool.query('DELETE FROM quotes WHERE id = ?', [id]);
  return result.affectedRows > 0;
}
