// Este archivo guarda la CONFIGURACION GENERAL del sistema (los ajustes de la
// pantalla Configuracion > Configuracion general: colores, tema por defecto,
// datos del taller que se imprimen en los PDF, etc.).
//
// La tabla es de clave/valor (`system_settings`, ver migraciones/032): una fila
// por ajuste. Que ajustes existen y de que tipo es cada uno NO se decide aqui
// sino en services/settingsService.js.
import pool from '../lib/db.js';

// Trae todos los ajustes guardados como un objeto plano { clave: valor }.
// Los valores siempre salen como texto: el service los convierte al tipo que toca.
export async function getAll() {
  const [rows] = await pool.query('SELECT setting_key, setting_value FROM system_settings');
  return Object.fromEntries(rows.map((r) => [r.setting_key, r.setting_value]));
}

// Guarda varios ajustes de un golpe. Si la clave ya existia la actualiza y si no
// la crea (`ON DUPLICATE KEY UPDATE`), asi funciona igual con una base recien
// migrada o con ajustes que se agregaron despues.
export async function saveMany(entries) {
  const pairs = Object.entries(entries);
  if (!pairs.length) return;
  const placeholders = pairs.map(() => '(?, ?)').join(', ');
  const values = pairs.flatMap(([key, value]) => [key, value == null ? null : String(value)]);
  await pool.query(
    `INSERT INTO system_settings (setting_key, setting_value) VALUES ${placeholders}
     ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
    values,
  );
}
