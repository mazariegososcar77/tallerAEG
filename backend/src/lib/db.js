/**
 * En palabras simples: este archivo abre la conexion hacia la base de
 * datos MySQL (donde vive toda la informacion real del sistema: usuarios,
 * clientes, ordenes, facturas, etc.) para que el resto del backend pueda
 * consultarla y guardar datos ahi.
 *
 * Usa un "pool" (una bolsa de conexiones reutilizables) en vez de abrir una
 * conexion nueva por cada peticion, lo cual es mas rapido y eficiente.
 */
import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     Number(process.env.DB_PORT) || 3306,
  database: process.env.DB_NAME     || 'talleraeg',
  user:     process.env.DB_USER     || 'aeg_user',
  password: process.env.DB_PASSWORD || 'AEG2026$',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

/**
 * Corre varias operaciones como una sola transaccion: si cualquiera falla, se
 * deshacen todas (rollback) y no queda nada a medias. Recibe una funcion y le
 * entrega la conexion (`conn`), que hay que ir pasandole a los repositorios
 * para que todas las consultas viajen por la MISMA conexion -- si alguna usa
 * el pool por su cuenta, queda fuera de la transaccion y no se deshace.
 *
 * Existe porque hay operaciones que tocan varias tablas a la vez y no pueden
 * quedar a medias: por ejemplo finalizar un reporte de trabajo descuenta el
 * material de bodega, escribe el kardex y actualiza el saldo del articulo.
 */
export async function withTransaction(fn) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export default pool;
