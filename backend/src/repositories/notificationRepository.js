// Este archivo consulta lo que hay que AVISAR (stock bajo, cotizaciones por
// vencer) y lleva el registro de los avisos que ya se mandaron para no
// repetirlos (`notifications_log`, ver migraciones/039).
//
// Ojo: aqui NO se manda ningun correo. El sistema no tiene SMTP; el envio lo
// hace n8n. Este archivo solo resuelve "que esta pendiente" y "de que ya avise".
import pool from '../lib/db.js';
import { ApiError } from '../utils/ApiError.js';

// La tabla notifications_log la crea la migracion 039. Si alguien levanta el
// backend sin aplicarla, es mejor decirlo con todas sus letras que fallar con
// un error de MySQL que no explica nada -- o peor, seguir adelante sin registro
// de deduplicacion y reenviar el mismo aviso en cada corrida del Cron.
function traducirTablaFaltante(e) {
  if (e.code === 'ER_NO_SUCH_TABLE') {
    return new ApiError(500, 'Falta aplicar la migracion 039_notifications_log.sql en la base de datos');
  }
  return e;
}

/**
 * Articulos que llegaron a su punto de reorden. `min_stock = 0` significa "este
 * articulo no avisa" (es el default de la columna), asi que la mano de obra y
 * los servicios quedan fuera solos, sin tener que marcarlos uno por uno.
 */
export async function lowStockArticles() {
  const [rows] = await pool.query(`
    SELECT a.id, a.code, a.name, a.quantity, a.min_stock, a.unit,
           at.name AS type_name, w.name AS warehouse_name
    FROM articles a
    LEFT JOIN article_types at ON a.type_id = at.id
    LEFT JOIN warehouses w ON a.warehouse_id = w.id
    WHERE a.is_active = 1 AND a.min_stock > 0 AND a.quantity <= a.min_stock
    ORDER BY (a.quantity - a.min_stock) ASC, a.name ASC
  `);
  return rows;
}

/**
 * Cotizaciones que estan por pasarse de su fecha "valida hasta".
 *
 * Solo las que estan en 'enviada': una en borrador todavia no se le mostro a
 * nadie, y una aprobada/rechazada/vencida ya no necesita seguimiento. Tambien
 * se incluyen las que ya se pasaron de fecha pero siguen marcadas 'enviada'
 * (nadie corrio a cambiarles el estado), que son justo las que se estan
 * perdiendo por olvido.
 */
export async function expiringQuotes(days) {
  const [rows] = await pool.query(`
    SELECT q.id, q.number, q.valid_until, q.total, q.work_type,
           CASE
             WHEN c.last_name IS NOT NULL AND c.last_name != ''
               THEN CONCAT(c.first_name, ' ', c.last_name)
             ELSE c.first_name
           END AS client_name,
           c.email AS client_email,
           DATEDIFF(q.valid_until, CURDATE()) AS days_left
    FROM quotes q
    LEFT JOIN clients c ON q.client_id = c.id
    WHERE q.status = 'enviada'
      AND q.valid_until IS NOT NULL
      AND q.valid_until <= DATE_ADD(CURDATE(), INTERVAL ? DAY)
    ORDER BY q.valid_until ASC
  `, [days]);
  return rows;
}

/**
 * De un tipo de aviso, cuales referencias ya se avisaron dentro de la ventana
 * de horas indicada. Devuelve un Set de "reference_type:reference_id" para que
 * quien llame filtre sin volver a consultar por cada elemento.
 */
export async function alreadySent(type, hours) {
  try {
    const [rows] = await pool.query(`
      SELECT reference_type, reference_id
      FROM notifications_log
      WHERE type = ? AND sent_at >= DATE_SUB(NOW(), INTERVAL ? HOUR)
    `, [type, hours]);
    return new Set(rows.map((r) => `${r.reference_type}:${r.reference_id}`));
  } catch (e) {
    throw traducirTablaFaltante(e);
  }
}

/**
 * Deja constancia de los avisos que n8n ya mando. Se llama DESPUES del envio a
 * proposito: si se registrara antes y el correo fallara, el aviso se perderia
 * para siempre (la siguiente corrida lo veria como "ya avisado").
 */
export async function logSent(entries) {
  if (!entries.length) return 0;
  const placeholders = entries.map(() => '(?, ?, ?, ?, ?)').join(', ');
  const values = entries.flatMap((e) => [
    e.type,
    e.reference_type,
    e.reference_id,
    e.channel || 'email',
    e.meta == null ? null : JSON.stringify(e.meta),
  ]);
  try {
    const [result] = await pool.query(
      `INSERT INTO notifications_log (type, reference_type, reference_id, channel, meta)
       VALUES ${placeholders}`,
      values,
    );
    return result.affectedRows;
  } catch (e) {
    throw traducirTablaFaltante(e);
  }
}

/** Ultimos avisos registrados, para la pantalla de Configuracion > Notificaciones. */
export async function recentLog(limit = 20) {
  try {
    const [rows] = await pool.query(
      `SELECT id, type, reference_type, reference_id, channel, meta, sent_at
       FROM notifications_log ORDER BY sent_at DESC, id DESC LIMIT ?`,
      [limit],
    );
    return rows;
  } catch (e) {
    // Aqui si se puede seguir sin la tabla: la pantalla simplemente muestra el
    // historial vacio en vez de romperse entera por un panel informativo.
    if (e.code === 'ER_NO_SUCH_TABLE') return [];
    throw e;
  }
}
