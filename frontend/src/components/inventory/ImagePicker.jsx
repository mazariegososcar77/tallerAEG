import { useState } from 'react';
import { Link2, Upload, X, ImageOff } from 'lucide-react';
import { articlesApi } from '../../api/articlesApi.js';
import { notify } from '../../lib/toast.js';
import { prepareImageForUpload, IMAGE_ACCEPT } from '../../lib/image.js';
import Input from '../ui/Input.jsx';
import Spinner from '../ui/Spinner.jsx';

/**
 * Selector de imagen reutilizable: alterna entre URL y subir archivo.
 * Controlado: `value` (lo que se guarda) + `onChange(valor)`.
 *
 * Este es el cuadro para elegir la foto de un articulo del inventario
 * (aparece en el formulario de Nuevo Articulo / Editar Articulo). El usuario
 * puede subir una foto desde su computadora, o pegar directamente el enlace
 * (URL) de una imagen que ya este en internet.
 *
 * OJO con la diferencia entre `value` y `previewUrl`, que ahora NO son lo mismo:
 * desde que las fotos viven en Google Cloud Storage, lo que se guarda (`value`)
 * es la RUTA del archivo en el bucket, que por si sola no se puede mostrar; para
 * verla hace falta la direccion temporal que arma el servidor (`previewUrl`).
 * Mezclarlas terminaria guardando en la base una direccion que vence en una hora.
 */
export default function ImagePicker({ value, previewUrl, onChange }) {
  const [mode, setMode] = useState('upload'); // 'upload' (subir archivo) o 'url' (pegar enlace)
  const [uploading, setUploading] = useState(false); // true mientras la imagen se esta subiendo
  const [progreso, setProgreso] = useState(0); // avance de la subida, 0 a 100
  const [broken, setBroken] = useState(false); // true si la imagen no se pudo mostrar (enlace invalido, etc.)
  // Vista previa local de la foto recien elegida: se ve al instante y evita
  // tener que pedirle al servidor una direccion para algo que el navegador ya
  // tiene en la mano.
  const [previewLocal, setPreviewLocal] = useState(null);

  // Que se muestra en el recuadro: la foto recien subida, la direccion temporal
  // que dio el servidor, o el valor tal cual (cuando es un enlace externo).
  const aMostrar = previewLocal || previewUrl || value;

  // Se ejecuta cuando el usuario elige un archivo de imagen de su computadora
  // (o del celular): lo convierte a WebP liviano, lo sube directo al bucket y
  // guarda la ruta con la que quedo.
  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true);
    setProgreso(0);
    try {
      // WebP: la foto de un articulo no se imprime en ningun PDF, asi que puede
      // usar el formato mas liviano (ver lib/image.js).
      const preparada = await prepareImageForUpload(file, 'webp');
      const { url } = await articlesApi.uploadImage(preparada, setProgreso);
      setBroken(false);
      setPreviewLocal(URL.createObjectURL(preparada));
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
        {aMostrar && !broken ? (
          <img
            src={aMostrar}
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
          {uploading
            ? (progreso > 0 && progreso < 100 ? `Subiendo... ${progreso}%` : 'Subiendo...')
            : 'Seleccionar imagen (cualquier formato)'}
          <input
            type="file"
            accept={IMAGE_ACCEPT}
            className="hidden"
            onChange={handleFile}
            disabled={uploading}
          />
        </label>
      ) : (
        <Input
          placeholder="https://ejemplo.com/imagen.jpg"
          // Solo se muestra aqui lo que de verdad es un enlace. Si la imagen se
          // subio al bucket, el valor guardado es una ruta interna: enseñarla en
          // un campo que dice "pega el enlace" no le sirve a nadie y encima invita
          // a editarla a mano.
          value={/^(https?:)?\//.test(value || '') ? value : ''}
          onChange={(e) => {
            setBroken(false);
            setPreviewLocal(null);
            onChange(e.target.value);
          }}
        />
      )}

      {value && (
        <button
          type="button"
          onClick={() => {
            setBroken(false);
            setPreviewLocal(null);
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
