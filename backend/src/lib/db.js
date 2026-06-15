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
