/**
 * En palabras simples: este archivo achica las fotos y videos que suben los
 * tecnicos ANTES de guardarlos para siempre, para no llenar el disco del
 * servidor -- la VM de produccion tiene poca RAM libre y nada de swap, asi
 * que el espacio en disco es lo que hay que cuidar de cerca (ver CLAUDE.md).
 *
 * Fotos: se re-comprimen con `sharp` (redimensiona + JPEG liviano). Video: se
 * mide la duracion con `ffprobe` (rechaza si pasa de 30s, antes de gastar CPU
 * comprimiendolo) y se transcodea con `ffmpeg` a un MP4 chico. Ambas
 * herramientas corren como procesos del sistema operativo (el paquete `ffmpeg`
 * de Alpine, instalado en el Dockerfile), no como llamadas a un servicio
 * externo -- no hay nada que configurar en `.env` para que esto funcione.
 */
import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import sharp from 'sharp';
import { ApiError } from '../utils/ApiError.js';

const execFileAsync = promisify(execFile);

// Cualquier lado de la foto se reduce hasta este maximo -- el frontend ya manda
// JPG <=1800px (ver frontend/src/lib/image.js), esto es la red de seguridad
// para cuando el navegador no pudo convertir la imagen y llega el archivo
// original (HEIC, TIFF, BMP... a veces varios MB).
const PHOTO_MAX_SIDE = 1600;
const PHOTO_JPEG_QUALITY = 80;

export const MAX_VIDEO_SECONDS = 30;
// Margen chico sobre el limite: un video "de 30 segundos" grabado por un
// celular casi nunca mide 30.000 exactos, y rechazar un 30.2s por error de
// redondeo es peor experiencia que aceptarlo.
const VIDEO_DURATION_TOLERANCE = 0.5;
const VIDEO_MAX_WIDTH = 640;
const VIDEO_CRF = 28;
const VIDEO_AUDIO_BITRATE = '64k';
// Un ffmpeg colgado (archivo raro, proceso que no responde) no debe dejar la
// peticion esperando para siempre.
const FFMPEG_TIMEOUT_MS = 60000;

/**
 * Re-comprime una foto ya guardada en disco (redimensiona a PHOTO_MAX_SIDE y
 * la re-encodea como JPEG calidad 80), reemplazando el archivo original en el
 * mismo lugar. Las fotos de etapa nunca necesitan transparencia, asi que
 * siempre se fuerza JPEG aunque el original fuera PNG/WEBP/etc.
 *
 * A proposito NO toca las firmas (`work_reports.tech_signature_url` /
 * `client_signature_url`): esta funcion solo la llama `workReportService.addPhoto`,
 * nunca `setSignature`, que sigue guardando el archivo tal como lo manda multer.
 */
export async function compressPhoto(filePath) {
  const buffer = await sharp(filePath)
    .rotate() // aplica la orientacion EXIF antes de quitarla (si no, la foto queda de lado)
    .resize({ width: PHOTO_MAX_SIDE, height: PHOTO_MAX_SIDE, fit: 'inside', withoutEnlargement: true })
    .flatten({ background: '#ffffff' }) // por si el original tenia transparencia (PNG/WEBP)
    .jpeg({ quality: PHOTO_JPEG_QUALITY, mozjpeg: true })
    .toBuffer();
  await fs.writeFile(filePath, buffer);
}

/** Duracion en segundos (numero con decimales) de un archivo de video, vía ffprobe. */
async function probeDurationSeconds(filePath) {
  try {
    const { stdout } = await execFileAsync(
      'ffprobe',
      ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', filePath],
      { timeout: FFMPEG_TIMEOUT_MS }
    );
    const seconds = parseFloat(stdout);
    if (!Number.isFinite(seconds)) throw new Error('duracion no numerica');
    return seconds;
  } catch (err) {
    throw new ApiError(400, 'No se pudo leer el video (formato no reconocido o archivo dañado)');
  }
}

/**
 * Procesa el video crudo que subio el tecnico: mide su duracion (rechaza si
 * excede MAX_VIDEO_SECONDS, ANTES de comprimir -- no tiene sentido gastar CPU
 * transcodeando algo que se va a rechazar) y lo transcodea a un MP4 chico
 * (ancho maximo VIDEO_MAX_WIDTH, H.264 CRF alto, audio a bitrate bajo) en
 * `outputPath`. El archivo de entrada (`inputPath`) NUNCA se guarda para
 * siempre -- quien llama esta funcion es responsable de borrarlo despues
 * (exito o error), este modulo solo lo lee.
 *
 * Devuelve { durationSeconds, sizeBytes } del archivo YA comprimido.
 */
export async function processVideo(inputPath, outputPath) {
  const durationSeconds = await probeDurationSeconds(inputPath);
  if (durationSeconds > MAX_VIDEO_SECONDS + VIDEO_DURATION_TOLERANCE) {
    throw new ApiError(400, `El video dura ${Math.round(durationSeconds)}s: el máximo permitido son ${MAX_VIDEO_SECONDS} segundos.`);
  }

  try {
    await execFileAsync('ffmpeg', [
      '-y', '-i', inputPath,
      '-vf', `scale='min(${VIDEO_MAX_WIDTH},iw)':-2`,
      '-c:v', 'libx264', '-preset', 'veryfast', '-crf', String(VIDEO_CRF),
      '-c:a', 'aac', '-b:a', VIDEO_AUDIO_BITRATE,
      '-movflags', '+faststart',
      outputPath,
    ], { timeout: FFMPEG_TIMEOUT_MS });
  } catch (err) {
    throw new ApiError(500, 'No se pudo procesar el video. Intenta con otro archivo.');
  }

  const { size } = await fs.stat(outputPath);
  return { durationSeconds: Math.round(durationSeconds), sizeBytes: size };
}
