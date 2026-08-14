/**
 * En palabras simples: este archivo se encarga de recibir archivos que el
 * usuario sube desde el navegador (fotos de articulos, fotos de reportes
 * de trabajo, firmas), revisa que sean del tipo y tamano permitido, y los
 * guarda en la carpeta "uploads" del servidor con un nombre unico.
 *
 * Subida de una imagen de articulo con multer (a disco). Valida tipo y tamano.
 */
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import multer from 'multer';
import { ApiError } from '../utils/ApiError.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const UPLOADS_DIR = path.join(__dirname, '..', '..', 'uploads');
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// El frontend ya convierte las fotos a JPG liviano antes de subirlas
// (frontend/src/lib/image.js), pero si el navegador del usuario no pudo leer el
// formato manda el archivo original: por eso aqui se aceptan tambien los
// formatos de camara/celular y un limite de tamano holgado.
const MAX_SIZE_MB = 12;
const ALLOWED_MIMES = new Set([
  'image/jpeg', 'image/jpg', 'image/pjpeg', // algunos navegadores usan estas variantes
  'image/png', 'image/webp', 'image/gif',
  'image/bmp', 'image/x-ms-bmp',
  'image/tiff', 'image/tif',
  'image/heic', 'image/heif', 'image/heic-sequence', 'image/heif-sequence', // fotos de iPhone
  'image/avif',
]);
// SVG queda fuera a proposito: se sirve desde el mismo dominio y puede llevar
// scripts adentro.
const ALLOWED_EXTS = /^\.(jpg|jpeg|png|webp|gif|bmp|tif|tiff|heic|heif|avif)$/;

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const ext = (path.extname(file.originalname) || '').toLowerCase();
    const safeExt = ALLOWED_EXTS.test(ext) ? ext : '.bin';
    cb(null, `${crypto.randomUUID()}${safeExt}`);
  },
});

// Acepta el archivo si el tipo declarado es una imagen conocida. Algunos
// celulares mandan tipos genericos (`application/octet-stream`) o vacios aunque
// el archivo si sea una foto; en ese caso se decide por la extension.
const fileFilter = (_req, file, cb) => {
  const mime = (file.mimetype || '').toLowerCase();
  const ext = (path.extname(file.originalname) || '').toLowerCase();
  if (ALLOWED_MIMES.has(mime)) return cb(null, true);
  const genericMime = !mime || mime === 'application/octet-stream' || mime === 'binary/octet-stream';
  if (genericMime && ALLOWED_EXTS.test(ext)) return cb(null, true);
  return cb(new ApiError(400, `Tipo de archivo no permitido: ${file.mimetype || 'desconocido'}`));
};

const single = multer({
  storage,
  limits: { fileSize: MAX_SIZE_MB * 1024 * 1024, files: 1 },
  fileFilter,
}).single('image');

// Recibe la foto de un articulo que el usuario sube desde el formulario
// (campo "image"), la guarda en disco, y si algo sale mal (archivo muy
// grande, tipo no permitido) devuelve un mensaje de error entendible.
export function uploadImage(req, res, next) {
  single(req, res, (err) => {
    if (!err) return next();
    if (err instanceof multer.MulterError) {
      const msg =
        err.code === 'LIMIT_FILE_SIZE' ? `La imagen excede ${MAX_SIZE_MB} MB` : err.message;
      return next(new ApiError(400, msg));
    }
    return next(err);
  });
}

// Foto de reportes de trabajo: mismo storage/validaciones, un archivo por llamada
// (el frontend llama este endpoint una vez por cada foto que el usuario agrega).
const singlePhoto = multer({
  storage,
  limits: { fileSize: MAX_SIZE_MB * 1024 * 1024, files: 1 },
  fileFilter,
}).single('photo');

// Igual que uploadImage, pero para las fotos que se agregan a un reporte
// de trabajo (campo "photo"). El usuario sube una foto a la vez, asi que
// esta funcion se llama una vez por cada foto agregada.
export function uploadReportPhoto(req, res, next) {
  singlePhoto(req, res, (err) => {
    if (!err) return next();
    if (err instanceof multer.MulterError) {
      const msg =
        err.code === 'LIMIT_FILE_SIZE' ? `La foto excede ${MAX_SIZE_MB} MB` : err.message;
      return next(new ApiError(400, msg));
    }
    return next(err);
  });
}

// ---------------------------------------------------------------------------
// Video final de prueba de un reporte de trabajo
// ---------------------------------------------------------------------------
// A diferencia de las fotos, el video CRUDO que sube el celular nunca se
// guarda para siempre: aqui solo se recibe a una carpeta temporal, y
// workReportService.setVideo lo comprime con ffmpeg a un MP4 chico (en
// UPLOADS_DIR, ese si definitivo) y borra el crudo apenas termina -- por eso
// vive en su propia subcarpeta, para que sea obvio que es basura de paso.
const VIDEO_TMP_DIR = path.join(UPLOADS_DIR, 'tmp');
fs.mkdirSync(VIDEO_TMP_DIR, { recursive: true });

// Limite generoso: es el archivo CRUDO (un celular grabando 4K puede pesar
// varias decenas de MB incluso en 30 segundos), no lo que queda guardado. La
// duracion real se valida despues con ffprobe (workReportService.setVideo);
// este limite solo evita que alguien llene el disco temporal con un archivo
// gigante antes de que ffprobe alcance a rechazarlo.
const MAX_VIDEO_SIZE_MB = 200;
const ALLOWED_VIDEO_MIMES = new Set([
  'video/mp4', 'video/quicktime', 'video/webm', 'video/3gpp', 'video/3gpp2',
  'video/x-msvideo', 'video/x-matroska',
]);
const ALLOWED_VIDEO_EXTS = /^\.(mp4|mov|webm|3gp|3g2|avi|mkv|m4v)$/;

const videoStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, VIDEO_TMP_DIR),
  filename: (_req, file, cb) => {
    const ext = (path.extname(file.originalname) || '').toLowerCase();
    const safeExt = ALLOWED_VIDEO_EXTS.test(ext) ? ext : '.bin';
    cb(null, `${crypto.randomUUID()}${safeExt}`);
  },
});

const videoFilter = (_req, file, cb) => {
  const mime = (file.mimetype || '').toLowerCase();
  const ext = (path.extname(file.originalname) || '').toLowerCase();
  if (ALLOWED_VIDEO_MIMES.has(mime)) return cb(null, true);
  const genericMime = !mime || mime === 'application/octet-stream' || mime === 'binary/octet-stream';
  if (genericMime && ALLOWED_VIDEO_EXTS.test(ext)) return cb(null, true);
  return cb(new ApiError(400, `Tipo de video no permitido: ${file.mimetype || 'desconocido'}`));
};

const singleVideo = multer({
  storage: videoStorage,
  limits: { fileSize: MAX_VIDEO_SIZE_MB * 1024 * 1024, files: 1 },
  fileFilter: videoFilter,
}).single('video');

// Recibe el video final de prueba de un reporte (campo "video"), a la
// carpeta temporal -- lo comprime y lo mueve a su lugar definitivo
// workReportService.setVideo.
export function uploadReportVideo(req, res, next) {
  singleVideo(req, res, (err) => {
    if (!err) return next();
    if (err instanceof multer.MulterError) {
      const msg =
        err.code === 'LIMIT_FILE_SIZE' ? `El video excede ${MAX_VIDEO_SIZE_MB} MB` : err.message;
      return next(new ApiError(400, msg));
    }
    return next(err);
  });
}

// ---------------------------------------------------------------------------
// Documentos adjuntos de una orden de trabajo
// ---------------------------------------------------------------------------
// Papeleria de terceros (la factura del torneador, un certificado, la cotizacion
// de un proveedor). A diferencia de las fotos, aqui el archivo llega tal como lo
// mando el tercero y no se puede exigir que sea una imagen: lo normal es un PDF.
const MAX_DOC_SIZE_MB = 20;
const ALLOWED_DOC_MIMES = new Set([
  'application/pdf',
  'text/plain', 'text/csv',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  // Una foto tambien vale como documento (la placa del motor, un recibo fotografiado).
  'image/jpeg', 'image/jpg', 'image/pjpeg', 'image/png', 'image/webp',
  'image/heic', 'image/heif', 'image/gif', 'image/bmp', 'image/tiff', 'image/tif',
]);
// SVG queda fuera igual que en las imagenes (se sirve desde el mismo dominio y
// puede llevar scripts adentro), y con el mismo criterio no se acepta nada
// ejecutable ni comprimido: un .zip o un .exe adjunto a una orden no es
// papeleria, y guardarlo en un directorio que se sirve por HTTP es un riesgo
// que no compensa.
const ALLOWED_DOC_EXTS = /^\.(pdf|txt|csv|doc|docx|xls|xlsx|jpg|jpeg|png|webp|heic|heif|gif|bmp|tif|tiff)$/;

const docStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const ext = (path.extname(file.originalname) || '').toLowerCase();
    // El nombre en disco es un UUID, nunca el que trae el archivo: el nombre
    // original lo elige un tercero y podria traer rutas o caracteres raros. El
    // nombre de verdad se guarda en la base (work_order_documents.original_name).
    const safeExt = ALLOWED_DOC_EXTS.test(ext) ? ext : '.bin';
    cb(null, `${crypto.randomUUID()}${safeExt}`);
  },
});

const docFilter = (_req, file, cb) => {
  const mime = (file.mimetype || '').toLowerCase();
  const ext = (path.extname(file.originalname) || '').toLowerCase();
  if (ALLOWED_DOC_MIMES.has(mime) && ALLOWED_DOC_EXTS.test(ext)) return cb(null, true);
  // Igual que con las fotos: hay navegadores y celulares que mandan un tipo
  // generico o vacio aunque el archivo si sea valido. En ese caso decide la
  // extension, que para esto es suficiente.
  const genericMime = !mime || mime === 'application/octet-stream' || mime === 'binary/octet-stream';
  if (genericMime && ALLOWED_DOC_EXTS.test(ext)) return cb(null, true);
  return cb(new ApiError(400, `Tipo de archivo no permitido: ${file.originalname || file.mimetype || 'desconocido'}. Se aceptan PDF, texto, Word, Excel e imagenes.`));
};

const singleDoc = multer({
  storage: docStorage,
  limits: { fileSize: MAX_DOC_SIZE_MB * 1024 * 1024, files: 1 },
  fileFilter: docFilter,
}).single('document');

// Recibe UN documento adjunto de una orden de trabajo (campo "document").
export function uploadDocument(req, res, next) {
  singleDoc(req, res, (err) => {
    if (!err) return next();
    if (err instanceof multer.MulterError) {
      const msg =
        err.code === 'LIMIT_FILE_SIZE' ? `El documento excede ${MAX_DOC_SIZE_MB} MB` : err.message;
      return next(new ApiError(400, msg));
    }
    return next(err);
  });
}
