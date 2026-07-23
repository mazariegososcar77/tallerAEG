import { useState } from 'react';
import { Upload, X, ImageOff } from 'lucide-react';
import { notify } from '../../lib/toast.js';
import Spinner from '../ui/Spinner.jsx';

/**
 * Galeria de fotos de una etapa del reporte de trabajo. Controlado: `photos`
 * (array de {id, photo_url, caption}), `onAdd(file)` y `onRemove(photoId)`
 * (ambos async, llamados una vez por foto agregada/eliminada).
 *
 * Este componente muestra las fotos tomadas para una etapa del Reporte de
 * Trabajo (por ejemplo "Antes de desarmar" o "Armado final"), en forma de
 * cuadricula, y permite agregar fotos nuevas o borrar las que ya no sirven.
 * Se usa dentro del formulario de Reporte de Trabajo, una vez por cada etapa.
 * `disabled` bloquea agregar/quitar fotos (ej. cuando el reporte ya quedo
 * finalizado y no se puede seguir editando).
 */
export default function PhotoStageGallery({ photos, onAdd, onRemove, disabled }) {
  const [uploading, setUploading] = useState(false); // true mientras se estan subiendo fotos
  const [removingId, setRemovingId] = useState(null); // id de la foto que se esta borrando en este momento

  // Se ejecuta cuando el usuario elige una o varias fotos para agregar: las
  // sube una por una (llamando a onAdd por cada archivo) y avisa si algo salio mal.
  const handleFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length) return;
    setUploading(true);
    try {
      for (const file of files) {
        await onAdd(file);
      }
      notify.success(files.length > 1 ? 'Fotos agregadas' : 'Foto agregada');
    } catch (err) {
      notify.error(err.message || 'Error al subir la foto');
    } finally {
      setUploading(false);
    }
  };

  // Borra una foto especifica de la galeria.
  const handleRemove = async (photoId) => {
    setRemovingId(photoId);
    try {
      await onRemove(photoId);
    } catch (err) {
      notify.error(err.message || 'Error al eliminar la foto');
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {photos.map((p) => (
          <div key={p.id} className="group relative h-28 overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
            <img src={p.photo_url} alt={p.caption || 'Foto'} className="h-full w-full object-cover" />
            {!disabled && (
              <button
                type="button"
                onClick={() => handleRemove(p.id)}
                disabled={removingId === p.id}
                className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
              >
                {removingId === p.id ? <Spinner size={12} /> : <X size={12} />}
              </button>
            )}
            {p.caption && (
              <p className="absolute inset-x-0 bottom-0 truncate bg-black/60 px-1.5 py-0.5 text-[10px] text-white">
                {p.caption}
              </p>
            )}
          </div>
        ))}

        {!disabled && (
          <label className="flex h-28 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-slate-300 text-slate-400 hover:border-orange-400 hover:bg-orange-50 hover:text-orange-500">
            {uploading ? <Spinner size={18} /> : <Upload size={18} />}
            <span className="text-[11px]">{uploading ? 'Subiendo...' : 'Agregar foto(s)'}</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              multiple
              className="hidden"
              onChange={handleFiles}
              disabled={uploading}
            />
          </label>
        )}

        {disabled && photos.length === 0 && (
          <div className="flex h-28 flex-col items-center justify-center gap-1 rounded-lg border border-slate-200 text-slate-300">
            <ImageOff size={18} />
            <span className="text-[11px]">Sin fotos</span>
          </div>
        )}
      </div>
    </div>
  );
}
