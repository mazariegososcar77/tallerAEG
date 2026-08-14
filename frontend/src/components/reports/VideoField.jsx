import { useState } from 'react';
import { Video, X, Upload } from 'lucide-react';
import { notify } from '../../lib/toast.js';
import Spinner from '../ui/Spinner.jsx';

// Mismo tope que el servidor (workReportService.MAX_VIDEO_SECONDS /
// mediaProcessing.js) -- este chequeo del navegador es solo para avisar
// rapido sin gastar una subida completa; el que de verdad manda es el
// servidor (mide con ffprobe y rechaza igual si se lo salta).
const MAX_VIDEO_SECONDS = 30;
const DURATION_TOLERANCE = 0.5;

/** Duracion en segundos del video, leida por el navegador (sin subirlo). */
function readDuration(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(video.duration);
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('El navegador no pudo leer este video'));
    };
    video.src = url;
  });
}

/**
 * Campo del video final de prueba del reporte de trabajo (una sola ranura,
 * mismo criterio que la firma). Controlado: `videoUrl`/`durationSeconds`/
 * `sizeBytes` (lo que ya esta guardado, o null si no hay nada todavia),
 * `onUpload(file)` y `onRemove()` (ambos async). `disabled` bloquea subir o
 * quitar el video (reporte finalizado sin permiso de forzar edicion).
 *
 * El navegador valida la duracion apenas se elige el archivo (aviso
 * inmediato, sin gastar una subida completa si dura mas de 30s), pero el
 * limite real lo aplica el servidor con ffprobe -- este chequeo es solo para
 * no hacer esperar al usuario en vano.
 */
export default function VideoField({ videoUrl, durationSeconds, sizeBytes, disabled, onUpload, onRemove }) {
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const duration = await readDuration(file);
      if (duration > MAX_VIDEO_SECONDS + DURATION_TOLERANCE) {
        notify.error(`El video dura ${Math.round(duration)}s: el máximo permitido son ${MAX_VIDEO_SECONDS} segundos.`);
        return;
      }
    } catch {
      // Si el navegador no supo leer la duracion, se manda igual: el
      // servidor la valida de verdad con ffprobe.
    }
    setUploading(true);
    try {
      await onUpload(file);
      notify.success('Video agregado');
    } catch (err) {
      notify.error(err.message || 'Error al subir el video');
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    setRemoving(true);
    try {
      await onRemove();
    } catch (err) {
      notify.error(err.message || 'Error al quitar el video');
    } finally {
      setRemoving(false);
    }
  };

  const sizeLabel = sizeBytes ? `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB` : null;

  if (videoUrl) {
    return (
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
        <video src={videoUrl} controls className="h-40 w-full max-w-xs rounded-lg border border-slate-200 bg-black sm:w-64" />
        <div className="flex flex-1 items-center justify-between gap-2 sm:flex-col sm:items-start">
          <p className="text-xs text-slate-500">
            Duración: {durationSeconds ?? '-'}s{sizeLabel ? ` · ${sizeLabel}` : ''}
          </p>
          {!disabled && (
            <button
              type="button"
              onClick={handleRemove}
              disabled={removing}
              className="flex items-center gap-1 rounded-md bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100"
            >
              {removing ? <Spinner size={12} /> : <X size={12} />} Quitar video
            </button>
          )}
        </div>
      </div>
    );
  }

  if (disabled) {
    return <p className="text-xs italic text-slate-400">Sin video.</p>;
  }

  return (
    <label className="flex h-28 w-full max-w-xs cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-slate-300 text-slate-400 hover:border-orange-400 hover:bg-orange-50 hover:text-orange-500">
      {uploading ? <Spinner size={18} /> : <Video size={18} />}
      <span className="flex items-center gap-1 text-[11px]">
        {uploading ? 'Subiendo y comprimiendo...' : <><Upload size={11} /> Grabar o elegir video (máx. 30s)</>}
      </span>
      <input type="file" accept="video/*" capture="environment" className="hidden" onChange={handleFile} disabled={uploading} />
    </label>
  );
}
