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

export default pool;
