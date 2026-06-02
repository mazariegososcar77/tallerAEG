/** Subida de una imagen de articulo con multer (a disco). Valida tipo y tamano. */
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

const single = multer({
  storage,
  limits: { fileSize: MAX_SIZE_MB * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) =>
    ALLOWED_MIMES.has(file.mimetype)
      ? cb(null, true)
      : cb(new ApiError(400, `Tipo de archivo no permitido: ${file.mimetype}`)),
}).single('image');

/** Envuelve multer para devolver errores como ApiError uniformes. */
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
