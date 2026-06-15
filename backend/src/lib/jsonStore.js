/**
 * Persistencia simple basada en archivos JSON.
 *
 * Actua como "base de datos" mientras no exista MySQL. Cada coleccion es un
 * archivo `<nombre>.json` dentro de src/data/ que contiene un arreglo de objetos.
 *
 * La escritura es atomica (se escribe a un archivo temporal y luego se renombra)
 * para evitar archivos corruptos si el proceso muere a mitad de la escritura.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'data');

function filePath(collection) {
  return path.join(DATA_DIR, `${collection}.json`);
}

/** Lee una coleccion. Devuelve [] si el archivo no existe o esta vacio. */
export function readCollection(collection) {
  try {
    const raw = fs.readFileSync(filePath(collection), 'utf8');
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

/** Escribe una coleccion completa de forma atomica. */
export function writeCollection(collection, rows) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const target = filePath(collection);
  const tmp = `${target}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(rows, null, 2), 'utf8');
  fs.renameSync(tmp, target);
}

/** Siguiente id entero autoincremental (imita AUTO_INCREMENT de MySQL). */
export function nextId(rows) {
  return rows.reduce((max, row) => Math.max(max, Number(row.id) || 0), 0) + 1;
}

/** Marca de tiempo ISO actual (para created_at / updated_at). */
export function now() {
  return new Date().toISOString();
}
