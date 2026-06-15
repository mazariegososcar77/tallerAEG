import { useState } from 'react';
import { Link2, Upload, X, ImageOff } from 'lucide-react';
import { articlesApi } from '../../api/articlesApi.js';
import { notify } from '../../lib/toast.js';
import Input from '../ui/Input.jsx';
import Spinner from '../ui/Spinner.jsx';

/**
 * Selector de imagen reutilizable: alterna entre URL y subir archivo.
 * Controlado: `value` (url) + `onChange(url)`.
 */
export default function ImagePicker({ value, onChange }) {
  const [mode, setMode] = useState('upload');
  const [uploading, setUploading] = useState(false);
  const [broken, setBroken] = useState(false);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true);
    try {
      const { url } = await articlesApi.uploadImage(file);
      setBroken(false);
      onChange(url);
      notify.success('Imagen subida');
    } catch (err) {
      notify.error(err.message);
    } finally {
      setUploading(false);
    }
  };

  const tabClass = (active) =>
    `flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
      active ? 'bg-orange-500 text-white' : 'bg-slate-100 text-navy-700 hover:bg-slate-200'
    }`;

  return (
    <div>
      <p className="mb-1 block text-sm font-medium text-navy-800">Imagen</p>

      {/* Previsualizacion */}
      <div className="mb-3 flex h-44 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
        {value && !broken ? (
          <img
            src={value}
            alt="Articulo"
            className="h-full w-full object-contain"
            onError={() => setBroken(true)}
          />
        ) : (
          <div className="flex flex-col items-center text-slate-300">
            <ImageOff size={36} />
            <span className="mt-1 text-xs text-slate-400">
              {broken ? 'No se pudo cargar la imagen' : 'Sin imagen'}
            </span>
          </div>
        )}
      </div>

      {/* Selector de modo */}
      <div className="mb-3 flex gap-2">
        <button type="button" className={tabClass(mode === 'upload')} onClick={() => setMode('upload')}>
          <Upload size={15} /> Subir archivo
        </button>
        <button type="button" className={tabClass(mode === 'url')} onClick={() => setMode('url')}>
          <Link2 size={15} /> Usar URL
        </button>
      </div>

      {mode === 'upload' ? (
        <label
          className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed
            border-slate-300 px-4 py-3 text-sm text-navy-700 hover:border-orange-400 hover:bg-orange-50"
        >
          {uploading ? <Spinner size={16} className="text-orange-500" /> : <Upload size={16} />}
          {uploading ? 'Subiendo...' : 'Seleccionar imagen (JPG, PNG, WEBP, GIF)'}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={handleFile}
            disabled={uploading}
          />
        </label>
      ) : (
        <Input
          placeholder="https://ejemplo.com/imagen.jpg"
          value={value || ''}
          onChange={(e) => {
            setBroken(false);
            onChange(e.target.value);
          }}
        />
      )}

      {value && (
        <button
          type="button"
          onClick={() => {
            setBroken(false);
            onChange('');
          }}
          className="mt-2 inline-flex items-center gap-1 text-xs text-red-600 hover:underline"
        >
          <X size={13} /> Quitar imagen
        </button>
      )}
    </div>
  );
}
