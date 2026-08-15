/**
 * Mueve a Google Cloud Storage los archivos que ya existen en el disco del
 * servidor, y deja en la base la ruta del objeto en lugar de `/uploads/<archivo>`.
 *
 * QUE HACE EXACTAMENTE, fila por fila:
 *   1. Lee un lote chico de filas cuya columna todavia empieza con `/uploads/`.
 *   2. Busca ese archivo en la carpeta de uploads.
 *   3. Lo sube al bucket, EN STREAMING, conservando el UUID que ya tenia el
 *      archivo en disco. Por eso correr el script dos veces es inofensivo: la
 *      misma fila siempre produce el mismo nombre de objeto, asi que a lo sumo
 *      se sobrescribe con lo mismo.
 *   4. Actualiza la columna con la ruta nueva.
 *
 * LO QUE NO HACE: no borra NADA. El archivo original se queda intacto en el
 * disco, y como el backend sabe leer los dos formatos (ver src/lib/mediaUrl.js),
 * volver atras es un UPDATE que restaure el prefijo `/uploads/`. El borrado del
 * volumen viejo es un paso aparte, semanas despues y con autorizacion expresa.
 *
 * DONDE SE CORRE: pensado para tu maquina o el runner, NO para la VM (que tiene
 * 1.9 GB de RAM sosteniendo dos MySQL). Necesita ver dos cosas:
 *   - la base de datos: por tunel SSH
 *       ssh -L 3306:localhost:3307 usuario@<IP_DE_LA_VM>     (prod; dev usa 3308)
 *   - los archivos: copiados antes desde el volumen de la VM
 *       docker run --rm -v talleraeg-prod_backend_uploads:/u -v $PWD:/out alpine \
 *         tar czf /out/uploads.tar.gz -C /u .
 *     y descomprimidos en la carpeta que se le pase en UPLOADS_DIR.
 *   El consumo de memoria es de unos pocos MB (sube un archivo a la vez, en
 *   streaming), asi que tambien se puede correr en la VM si hiciera falta.
 *
 * USO:
 *   node scripts/migrate-uploads-to-gcs.mjs --dry-run
 *   node scripts/migrate-uploads-to-gcs.mjs --tabla=work_report_photos
 *   node scripts/migrate-uploads-to-gcs.mjs --lote=50 --limite=500
 *
 * VARIABLES DE ENTORNO:
 *   GCS_BUCKET   bucket destino (talleraeg-media-dev primero, prod despues)
 *   UPLOADS_DIR  carpeta con los archivos (por defecto: ../uploads de este repo)
 *   DB_HOST / DB_PORT / DB_NAME / DB_USER / DB_PASSWORD  (los de siempre)
 *
 * Deja un registro completo en migrate-uploads-<fecha>.log: una fila con
 * problemas no aborta el proceso, se anota y se sigue con la siguiente.
 */
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';
import { Storage } from '@google-cloud/storage';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// Que columnas se migran
// ---------------------------------------------------------------------------
// `entidad` decide el prefijo dentro del bucket y `fecha` la columna con la que
// se particiona por anio/mes (la fecha real de ese archivo, no la de hoy: asi
// una foto de 2025 queda en reportes/2025/.. aunque se migre en 2026).
const OBJETIVOS = [
  { tabla: 'work_report_photos', columna: 'photo_url',            entidad: 'reportes',   fecha: 'created_at' },
  { tabla: 'work_reports',       columna: 'tech_signature_url',   entidad: 'firmas',     fecha: 'created_at' },
  { tabla: 'work_reports',       columna: 'client_signature_url', entidad: 'firmas',     fecha: 'created_at' },
  { tabla: 'work_reports',       columna: 'final_video_url',      entidad: 'videos',     fecha: 'created_at' },
  { tabla: 'service_orders',     columna: 'tech_signature_url',   entidad: 'firmas',     fecha: 'created_at' },
  { tabla: 'service_orders',     columna: 'client_signature_url', entidad: 'firmas',     fecha: 'created_at' },
  { tabla: 'work_order_documents', columna: 'file_url',           entidad: 'documentos', fecha: 'created_at' },
  { tabla: 'articles',           columna: 'image_url',            entidad: 'articulos',  fecha: 'created_at' },
];

// Extensiones que se aceptan al MIGRAR. Son mas amplias que las que el backend
// permite para una subida nueva (src/lib/gcsStorage.js) y tiene que ser asi:
// aquellas gobiernan lo que se puede subir de hoy en adelante (siempre JPG, PNG
// o WebP, porque los arma el navegador), mientras que aqui hay que aceptar lo
// que multer dejo entrar durante anios -- un HEIC de iPhone, un BMP, un TIFF.
// El contenido de esos archivos suele ser JPEG (el backend los recomprimia
// dejandoles el nombre original), pero el nombre se respeta tal cual: renombrar
// extensiones seria inventar informacion sobre archivos que no se abrieron.
const IMAGENES_HISTORICAS = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'tif', 'tiff', 'heic', 'heif', 'avif'];
const EXTENSIONES = {
  articulos:  IMAGENES_HISTORICAS,
  reportes:   IMAGENES_HISTORICAS,
  firmas:     IMAGENES_HISTORICAS, // se dibujan en PNG, pero no vale la pena morir por eso
  videos:     ['mp4'],
  documentos: ['pdf', 'txt', 'csv', 'doc', 'docx', 'xls', 'xlsx', ...IMAGENES_HISTORICAS],
};

const TIPOS = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp',
  gif: 'image/gif', bmp: 'image/bmp', tif: 'image/tiff', tiff: 'image/tiff',
  heic: 'image/heic', heif: 'image/heif', avif: 'image/avif', mp4: 'video/mp4',
  pdf: 'application/pdf', txt: 'text/plain', csv: 'text/csv',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

// ---------------------------------------------------------------------------
// Argumentos y configuracion
// ---------------------------------------------------------------------------
const args = process.argv.slice(2);
const flag = (nombre, porDefecto = null) => {
  const encontrado = args.find((a) => a.startsWith(`--${nombre}=`));
  return encontrado ? encontrado.split('=').slice(1).join('=') : porDefecto;
};
const DRY_RUN = args.includes('--dry-run');
const TABLA_FILTRO = flag('tabla');
const LOTE = Number(flag('lote', 50));
const LIMITE = Number(flag('limite', 0)); // 0 = sin tope
const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(__dirname, '..', 'uploads');
const BUCKET = process.env.GCS_BUCKET;

const LOG_PATH = path.join(process.cwd(), `migrate-uploads-${new Date().toISOString().slice(0, 10)}.log`);
const logStream = fs.createWriteStream(LOG_PATH, { flags: 'a' });
function log(mensaje) {
  const linea = `[${new Date().toISOString()}] ${mensaje}`;
  console.log(linea);
  logStream.write(linea + '\n');
}

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------
/**
 * Arma la ruta destino conservando el UUID que el archivo ya tiene en disco.
 * Es lo que hace al script idempotente: la fila 412 siempre produce
 * `reportes/2026/03/<ese mismo uuid>.jpg`, se corra una vez o cinco.
 */
function rutaDestino(entidad, nombreArchivo, fecha) {
  const extension = path.extname(nombreArchivo).slice(1).toLowerCase();
  const base = path.basename(nombreArchivo, path.extname(nombreArchivo));
  if (!EXTENSIONES[entidad].includes(extension)) {
    throw new Error(`extension "${extension}" no permitida para ${entidad}`);
  }
  const d = fecha ? new Date(fecha) : new Date();
  const valida = Number.isNaN(d.getTime()) ? new Date() : d;
  const anio = valida.getFullYear();
  const mes = String(valida.getMonth() + 1).padStart(2, '0');
  return `${entidad}/${anio}/${mes}/${base}.${extension}`;
}

// ---------------------------------------------------------------------------
// Migracion de una columna
// ---------------------------------------------------------------------------
async function migrarColumna(conn, bucket, objetivo, contadores) {
  const { tabla, columna, entidad, fecha } = objetivo;

  // Se cuenta primero para poder informar el avance. La condicion es la misma
  // que despues filtra los lotes: solo lo que sigue apuntando al disco viejo.
  const [[{ total }]] = await conn.query(
    `SELECT COUNT(*) AS total FROM \`${tabla}\` WHERE \`${columna}\` LIKE '/uploads/%'`
  );
  if (total === 0) {
    log(`${tabla}.${columna}: nada pendiente`);
    return;
  }
  log(`${tabla}.${columna}: ${total} fila(s) pendientes`);

  let ultimoId = 0;
  let procesadas = 0;
  for (;;) {
    if (LIMITE && contadores.migradas >= LIMITE) {
      log(`Se alcanzo el limite de ${LIMITE} archivos: se detiene aqui.`);
      return;
    }
    // Se pagina por id y NO con OFFSET: cada fila migrada deja de cumplir la
    // condicion del WHERE, asi que un OFFSET se saltaria filas sin tocar. Ir
    // por id ascendente tambien permite reanudar despues de un corte sin
    // reprocesar lo ya hecho.
    const [filas] = await conn.query(
      `SELECT id, \`${columna}\` AS valor, \`${fecha}\` AS fecha
         FROM \`${tabla}\`
        WHERE \`${columna}\` LIKE '/uploads/%' AND id > ?
        ORDER BY id
        LIMIT ?`,
      [ultimoId, LOTE]
    );
    if (filas.length === 0) break;

    for (const fila of filas) {
      ultimoId = fila.id;
      procesadas++;
      const nombreArchivo = path.basename(fila.valor);
      const rutaLocal = path.join(UPLOADS_DIR, nombreArchivo);

      try {
        if (!fs.existsSync(rutaLocal)) {
          // Pasa con archivos borrados a mano o perdidos en algun redeploy
          // viejo: la fila se deja como esta (el sistema ya sabe mostrar el
          // recuadro gris) y se anota para revisarla despues.
          contadores.faltantes++;
          log(`FALTA  ${tabla}#${fila.id} ${columna}: no existe ${nombreArchivo}`);
          continue;
        }

        const destino = rutaDestino(entidad, nombreArchivo, fila.fecha);
        const extension = path.extname(nombreArchivo).slice(1).toLowerCase();

        if (DRY_RUN) {
          contadores.migradas++;
          log(`(simulacion) ${tabla}#${fila.id} ${fila.valor} -> ${destino}`);
          continue;
        }

        await bucket.upload(rutaLocal, {
          destination: destino,
          resumable: false, // archivos chicos: una sola peticion, sin sesion reanudable
          metadata: {
            contentType: TIPOS[extension] || 'application/octet-stream',
            cacheControl: 'private, max-age=3600',
          },
        });
        await conn.query(
          `UPDATE \`${tabla}\` SET \`${columna}\` = ? WHERE id = ?`,
          [destino, fila.id]
        );
        contadores.migradas++;
        log(`OK     ${tabla}#${fila.id} ${fila.valor} -> ${destino}`);
      } catch (err) {
        // Una fila con problemas nunca corta la corrida completa.
        contadores.errores++;
        log(`ERROR  ${tabla}#${fila.id} ${columna} (${nombreArchivo}): ${err.message}`);
      }
    }
    log(`${tabla}.${columna}: ${procesadas}/${total}`);
  }
}

// ---------------------------------------------------------------------------
// Principal
// ---------------------------------------------------------------------------
async function main() {
  if (!BUCKET && !DRY_RUN) {
    console.error('Falta GCS_BUCKET. Ejemplo: GCS_BUCKET=talleraeg-media-dev node scripts/migrate-uploads-to-gcs.mjs');
    process.exit(1);
  }
  if (!fs.existsSync(UPLOADS_DIR)) {
    console.error(`No existe la carpeta de archivos: ${UPLOADS_DIR} (usa UPLOADS_DIR=...)`);
    process.exit(1);
  }

  const objetivos = TABLA_FILTRO ? OBJETIVOS.filter((o) => o.tabla === TABLA_FILTRO) : OBJETIVOS;
  if (objetivos.length === 0) {
    console.error(`No hay nada configurado para la tabla "${TABLA_FILTRO}".`);
    process.exit(1);
  }

  log('='.repeat(70));
  log(`Migracion de archivos a GCS${DRY_RUN ? ' (SIMULACION, no se escribe nada)' : ''}`);
  log(`Bucket: ${BUCKET || '(sin bucket, es simulacion)'}`);
  log(`Archivos: ${UPLOADS_DIR}`);
  log(`Base: ${process.env.DB_NAME || 'talleraeg'} en ${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 3306}`);
  log(`Tablas: ${objetivos.map((o) => `${o.tabla}.${o.columna}`).join(', ')}`);
  log('='.repeat(70));

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'aeg_user',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'talleraeg',
  });
  const bucket = DRY_RUN ? null : new Storage().bucket(BUCKET);

  const contadores = { migradas: 0, faltantes: 0, errores: 0 };
  try {
    for (const objetivo of objetivos) {
      await migrarColumna(conn, bucket, objetivo, contadores);
    }
  } finally {
    await conn.end();
  }

  log('-'.repeat(70));
  log(`Migrados: ${contadores.migradas} · Sin archivo: ${contadores.faltantes} · Errores: ${contadores.errores}`);
  log(`Registro completo en: ${LOG_PATH}`);
  if (!DRY_RUN) {
    log('Los archivos originales NO se borraron: siguen en la carpeta de uploads.');
  }
  logStream.end();
}

main().catch((err) => {
  log(`FALLO GENERAL: ${err.stack || err.message}`);
  logStream.end();
  process.exit(1);
});
