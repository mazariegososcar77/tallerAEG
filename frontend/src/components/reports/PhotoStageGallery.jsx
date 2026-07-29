import { useState } from 'react';
import { Upload, X, ImageOff, Camera, Images } from 'lucide-react';
import { notify } from '../../lib/toast.js';
import { prepareImageForUpload, IMAGE_ACCEPT } from '../../lib/image.js';
import { useIsMobile } from '../../hooks/useIsMobile.js';
import Spinner from '../ui/Spinner.jsx';

/**
 * Cada "boton" para agregar fotos es en realidad una etiqueta con un input de
 * archivo escondido adentro; `capture` es lo que hace que el celular abra la
 * camara en vez del explorador de archivos. Vive fuera del componente para que
 * React no vuelva a crear el input en cada redibujado (si lo hiciera, podria
 * perderse la foto que el usuario acaba de elegir).
 */
function AddTile({ icon: Icon, label, capture, multiple, uploading, onFiles }) {
  return (
    <label className="flex h-28 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-slate-300 text-slate-400 hover:border-orange-400 hover:bg-orange-50 hover:text-orange-500">
      {uploading ? <Spinner size={18} /> : <Icon size={18} />}
      <span className="text-[11px]">{uploading ? 'Subiendo...' : label}</span>
      <input
        type="file"
        accept={IMAGE_ACCEPT}
        {...(capture ? { capture: 'environment' } : {})}
        multiple={multiple}
        className="hidden"
        onChange={onFiles}
        disabled={uploading}
      />
    </label>
  );
}

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
 *
 * En celular/tablet aparecen dos botones: "Tomar foto" (abre la camara
 * directamente) y "Galeria" (elige fotos ya guardadas en el dispositivo). En
 * computadora solo aparece el boton de seleccionar archivos. Cualquier formato
 * de imagen sirve: antes de subirse se convierte a JPG liviano
 * (ver lib/image.js).
 */
export default function PhotoStageGallery({ photos, onAdd, onRemove, disabled }) {
  const isMobile = useIsMobile();
  const [uploading, setUploading] = useState(false); // true mientras se estan subiendo fotos
  const [removingId, setRemovingId] = useState(null); // id de la foto que se esta borrando en este momento

  // Se ejecuta cuando el usuario elige una o varias fotos (o toma una con la
  // camara): las convierte a JPG y las sube una por una llamando a onAdd.
  const handleFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length) return;
    setUploading(true);
    try {
      for (const file of files) {
        await onAdd(await prepareImageForUpload(file));
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

        {/* En celular: camara y galeria por separado. En computadora: un solo
            boton para elegir archivos. */}
        {!disabled && isMobile && (
          <AddTile icon={Camera} label="Tomar foto" capture uploading={uploading} onFiles={handleFiles} />
        )}
        {!disabled && isMobile && (
          <AddTile icon={Images} label="Galeria" multiple uploading={uploading} onFiles={handleFiles} />
        )}
        {!disabled && !isMobile && (
          <AddTile icon={Upload} label="Agregar foto(s)" multiple uploading={uploading} onFiles={handleFiles} />
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
