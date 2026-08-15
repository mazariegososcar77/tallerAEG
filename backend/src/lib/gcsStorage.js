/**
 * En palabras simples: este archivo es el unico punto del sistema que sabe
 * hablar con Google Cloud Storage (GCS), el disco de Google donde ahora viven
 * las fotos, firmas, videos y documentos que sube la gente. Antes esos
 * archivos se guardaban en el disco del servidor; el problema es que la VM de
 * produccion tiene 1.9 GB de RAM y ese disco crecia sin control, ademas de que
 * cada foto que alguien miraba pasaba por Node.
 *
 * Como funciona ahora: el navegador sube el archivo DIRECTO al bucket usando
 * una "URL firmada" que este modulo genera, y para verlo se genera otra URL
 * firmada de lectura. El archivo nunca pasa por el backend -- que es
 * exactamente lo que habia que lograr.
 *
 * AUTENTICACION: no hay ni debe haber un archivo de llave JSON. La VM tiene
 * adjunta la service account `talleraeg-storage`, asi que la libreria consigue
 * las credenciales sola (ADC, via el metadata server) y firma las URLs con la
 * API de IAM (`signBlob`). En una maquina de desarrollo pasa lo mismo si se
 * corrio `gcloud auth application-default login`.
 *
 * Si `GCS_BUCKET` no esta configurado, este modulo se apaga entero y el sistema
 * sigue guardando en el disco local como toda la vida (ver `estaConfigurado`).
 * Es el mismo criterio que ya usa la certificacion FEL con Digifact: sin
 * credenciales, el modulo no llama a nadie y la funcionalidad vieja sigue
 * viva.
 */
import crypto from 'crypto';
import os from 'os';
import path from 'path';
import fs from 'fs/promises';
import { createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import { Storage } from '@google-cloud/storage';

// Prefijo de cada tipo de archivo dentro del bucket. El entorno NO va en la
// ruta (prod y dev tienen buckets distintos), y el nombre del archivo siempre
// es un UUID: nadie debe poder adivinar la ruta de la foto de otra orden.
export const ENTIDADES = {
  articulos:  { prefijo: 'articulos',  extensiones: ['jpg', 'jpeg', 'png', 'webp'] },
  reportes:   { prefijo: 'reportes',   extensiones: ['jpg', 'jpeg', 'png'] },
  firmas:     { prefijo: 'firmas',     extensiones: ['png'] },
  videos:     { prefijo: 'videos',     extensiones: ['mp4'] },
  documentos: { prefijo: 'documentos', extensiones: [
    'pdf', 'txt', 'csv', 'doc', 'docx', 'xls', 'xlsx',
    'jpg', 'jpeg', 'png', 'webp', 'heic', 'heif', 'gif', 'bmp', 'tif', 'tiff',
  ] },
};

// Cuanto vive cada URL firmada.
// - Lectura: una hora. La pantalla del reporte puede quedar abierta un buen
//   rato mientras el tecnico toma fotos, y una URL de 15 minutos dejaria la
//   galeria llena de imagenes rotas.
// - Subida: diez minutos. Es tiempo de sobra para subir una foto desde el
//   celular del taller, y limita la ventana en que esa URL sirve para escribir.
const MINUTOS_LECTURA = 60;
const MINUTOS_SUBIDA = 10;

// Las URLs firmadas se guardan un rato en memoria y esto NO es un lujo: al no
// haber llave privada local, cada firma es una llamada de red a la API de IAM.
// Sin este cache, abrir un reporte con 30 fotos serian 30 llamadas a Google en
// una sola peticion. Se reusa la misma URL hasta que le queden 10 minutos de
// vida, y ahi se firma de nuevo.
const MS_CACHE = (MINUTOS_LECTURA - 10) * 60 * 1000;
const cacheLectura = new Map();
// Tope del cache para que no crezca sin fin en un proceso de larga vida (el
// backend corre semanas sin reiniciarse). Al llenarse se descarta lo mas viejo.
const MAX_CACHE = 2000;

let clienteStorage = null;

/**
 * ¿Esta configurado el almacenamiento en la nube? Si no, todo el sistema sigue
 * guardando en el disco local. Es lo que permite trabajar en una maquina de
 * desarrollo sin credenciales de Google y desplegar el cambio sin que nada se
 * rompa el dia que se despliega.
 */
export function estaConfigurado() {
  return Boolean(process.env.GCS_BUCKET);
}

/** Nombre del bucket configurado (o null). */
export function nombreBucket() {
  return process.env.GCS_BUCKET || null;
}

// Cliente unico, reutilizado por todo el proceso. Crear un cliente por
// peticion significaria renegociar credenciales cada vez.
function bucket() {
  if (!estaConfigurado()) {
    throw new Error('GCS_BUCKET no esta configurado: no se puede usar el almacenamiento en la nube');
  }
  if (!clienteStorage) clienteStorage = new Storage();
  return clienteStorage.bucket(process.env.GCS_BUCKET);
}

/**
 * ¿Este valor guardado en la base es una ruta de objeto de GCS?
 *
 * Las tres formas que puede tener una columna de media hoy:
 *   1. `/uploads/<archivo>`  -> archivo viejo, en el disco del servidor
 *   2. `https://...`         -> URL externa (solo articles.image_url, se pega a mano)
 *   3. `reportes/2026/08/<uuid>.jpg` -> ruta de objeto en el bucket
 * Solo la tercera se firma.
 */
export function esRutaObjeto(valor) {
  if (!valor || typeof valor !== 'string') return false;
  if (valor.startsWith('/')) return false;
  if (valor.startsWith('http://') || valor.startsWith('https://')) return false;
  if (valor.startsWith('data:')) return false;
  return /^[a-z]+\/\d{4}\/\d{2}\/[0-9a-f-]{36}\.[a-z0-9]{2,5}$/i.test(valor);
}

/**
 * Arma la ruta del objeto dentro del bucket:
 *   <entidad>/<anio>/<mes>/<uuid>.<extension>
 *
 * El UUID hace que la ruta no se pueda adivinar (nunca `orden-1234.jpg`), y la
 * particion por anio/mes es lo que despues permite listar o aplicar reglas de
 * ciclo de vida sin recorrer un directorio de decenas de miles de objetos.
 *
 * `uuid` se puede forzar: lo usa el script de migracion para conservar el
 * mismo UUID que el archivo ya tenia en disco, y asi poder correrlo dos veces
 * sin duplicar nada.
 */
export function construirRutaObjeto(entidad, extension, { fecha = new Date(), uuid = null } = {}) {
  const config = ENTIDADES[entidad];
  if (!config) throw new Error(`Entidad de almacenamiento desconocida: ${entidad}`);
  const ext = String(extension || '').toLowerCase().replace(/^\./, '');
  if (!config.extensiones.includes(ext)) {
    throw new Error(`Extension no permitida para ${entidad}: ${ext}`);
  }
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  return `${config.prefijo}/${anio}/${mes}/${uuid || crypto.randomUUID()}.${ext}`;
}

/**
 * Confirma que una ruta que mando el navegador es realmente del tipo de
 * archivo que dice ser. Sin esto, cualquiera con sesion podria mandar como
 * "foto de mi reporte" la ruta del documento confidencial de otra orden y
 * hacer que el sistema se la firme.
 */
export function validarRutaObjeto(ruta, entidad) {
  if (!esRutaObjeto(ruta)) return false;
  const config = ENTIDADES[entidad];
  if (!config) return false;
  if (!ruta.startsWith(`${config.prefijo}/`)) return false;
  const ext = path.extname(ruta).slice(1).toLowerCase();
  return config.extensiones.includes(ext);
}

/**
 * URL firmada de LECTURA (v4). Es lo que se le manda al navegador para que
 * muestre la imagen; vence en una hora y nunca se guarda en la base de datos.
 */
export async function firmarLectura(rutaObjeto) {
  const enCache = cacheLectura.get(rutaObjeto);
  if (enCache && enCache.vence > Date.now()) return enCache.url;

  const [url] = await bucket().file(rutaObjeto).getSignedUrl({
    version: 'v4',
    action: 'read',
    expires: Date.now() + MINUTOS_LECTURA * 60 * 1000,
  });

  if (cacheLectura.size >= MAX_CACHE) {
    cacheLectura.delete(cacheLectura.keys().next().value);
  }
  cacheLectura.set(rutaObjeto, { url, vence: Date.now() + MS_CACHE });
  return url;
}

/**
 * URL firmada de SUBIDA (v4, metodo PUT). El navegador sube el archivo
 * directo al bucket con ella -- el archivo no pasa por Node, que es todo el
 * punto de este cambio.
 *
 * El `contentType` queda fijado en la firma: si el navegador manda otro tipo,
 * Google rechaza la subida. Eso evita que una URL pedida para una foto sirva
 * para subir cualquier otra cosa.
 */
export async function firmarSubida(rutaObjeto, contentType) {
  const [url] = await bucket().file(rutaObjeto).getSignedUrl({
    version: 'v4',
    action: 'write',
    contentType,
    expires: Date.now() + MINUTOS_SUBIDA * 60 * 1000,
  });
  return { url, expiraEn: MINUTOS_SUBIDA * 60 };
}

/** ¿El objeto existe de verdad en el bucket? */
export async function existeObjeto(rutaObjeto) {
  const [existe] = await bucket().file(rutaObjeto).exists();
  return existe;
}

/**
 * Sube un archivo del disco del servidor al bucket, en streaming (nunca se
 * carga entero en memoria). Solo lo usa el video del reporte, que es el unico
 * archivo que todavia pasa por el backend porque hay que comprimirlo con
 * ffmpeg antes de guardarlo.
 */
export async function subirArchivo(rutaLocal, rutaObjeto, contentType) {
  await bucket().upload(rutaLocal, {
    destination: rutaObjeto,
    resumable: false,
    metadata: { contentType, cacheControl: 'private, max-age=3600' },
  });
  return rutaObjeto;
}

/**
 * Borra un objeto del bucket. No falla si ya no existe: igual que con los
 * archivos en disco, lo que importa es que el registro desaparezca de la base.
 */
export async function borrarObjeto(rutaObjeto) {
  if (!estaConfigurado() || !esRutaObjeto(rutaObjeto)) return false;
  try {
    await bucket().file(rutaObjeto).delete({ ignoreNotFound: true });
    cacheLectura.delete(rutaObjeto);
    return true;
  } catch (err) {
    // Que no se pueda borrar el archivo no debe tumbar la operacion que lo
    // pidio (quitar una foto, borrar un documento). Queda el aviso en el log y
    // a lo sumo sobra un objeto en el bucket.
    console.warn(`[gcs] no se pudo borrar ${rutaObjeto}: ${err.message}`);
    return false;
  }
}

/**
 * Baja un objeto a un archivo temporal del servidor y devuelve su ruta local.
 *
 * Existe por una sola razon: `pdfkit` necesita los bytes de la imagen para
 * embeberla en el PDF, y no sabe leer una URL. Se baja en STREAMING a disco
 * (no a memoria) y quien lo llama es responsable de borrarlo despues -- ver
 * `limpiarTemporales`.
 */
export async function descargarATemporal(rutaObjeto) {
  const destino = path.join(os.tmpdir(), `aeg-${crypto.randomUUID()}${path.extname(rutaObjeto)}`);
  await pipeline(bucket().file(rutaObjeto).createReadStream(), createWriteStream(destino));
  return destino;
}

/** Borra los temporales que dejo `descargarATemporal` (nunca lanza error). */
export async function limpiarTemporales(rutas) {
  await Promise.all((rutas || []).map((r) => fs.unlink(r).catch(() => {})));
}
