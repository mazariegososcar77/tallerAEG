/**
 * IMPORTANTE — este archivo esta OBSOLETO / ya no se usa en el sistema real.
 *
 * En palabras simples: hace mucho tiempo, antes de tener una base de datos
 * de verdad (MySQL), el sistema guardaba toda la informacion en archivos de
 * texto (.json) dentro de la carpeta src/data/. Ese metodo quedo abandonado:
 * hoy en dia NINGUNA parte del sistema en uso lee esos archivos. Solo lo
 * sigue usando el script viejo `npm run seed` (ver src/seed.js), que ya no
 * sirve para inicializar la aplicacion real. Se conserva el archivo por
 * referencia historica, no hace falta entenderlo para saber como funciona
 * el sistema hoy.
 *
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

// Lee todos los datos guardados en un archivo .json (por ejemplo "users").
// Si el archivo no existe o esta vacio, devuelve una lista vacia.
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

// Guarda una lista completa de datos en su archivo .json correspondiente,
// de forma seguras (para no dejar el archivo a medio escribir si algo falla).
/** Escribe una coleccion completa de forma atomica. */
export function writeCollection(collection, rows) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const target = filePath(collection);
  const tmp = `${target}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(rows, null, 2), 'utf8');
  fs.renameSync(tmp, target);
}

// Calcula el siguiente numero de identificacion (id) disponible para un
// registro nuevo, buscando el id mas alto que ya existe y sumandole 1.
/** Siguiente id entero autoincremental (imita AUTO_INCREMENT de MySQL). */
export function nextId(rows) {
  return rows.reduce((max, row) => Math.max(max, Number(row.id) || 0), 0) + 1;
}

// Devuelve la fecha y hora actual, para guardarla como "creado el" o
// "actualizado el" en un registro.
/** Marca de tiempo ISO actual (para created_at / updated_at). */
export function now() {
  return new Date().toISOString();
}
