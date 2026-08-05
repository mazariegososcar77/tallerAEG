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

const MAX_SIZE_MB = 5;
const ALLOWED_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const ext = (path.extname(file.originalname) || '').toLowerCase();
    const safeExt = /^\.(jpg|jpeg|png|webp|gif)$/.test(ext) ? ext : '.bin';
    cb(null, `${crypto.randomUUID()}${safeExt}`);
  },
});

const fileFilter = (_req, file, cb) =>
  ALLOWED_MIMES.has(file.mimetype)
    ? cb(null, true)
    : cb(new ApiError(400, `Tipo de archivo no permitido: ${file.mimetype}`));

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
