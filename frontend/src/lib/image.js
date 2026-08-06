/**
 * Prepara las imagenes antes de subirlas al servidor.
 *
 * El problema que resuelve: la gente sube fotos en formatos muy distintos
 * (JPG, PNG, WEBP, HEIC del iPhone, BMP, TIFF...) y de hasta 10-12 MB si vienen
 * de la camara de un celular moderno. Varios de esos formatos no se pueden
 * mostrar en pantalla ni imprimir en el PDF del reporte, y los archivos grandes
 * eran rechazados por el limite de tamaño del servidor.
 *
 * La solucion: el navegador abre la foto (sabe leer casi cualquier formato,
 * incluido el HEIC del iPhone), la redibuja mas pequeña y la vuelve a guardar
 * como JPG. Asi el servidor siempre recibe un JPG normal, liviano y que si se
 * puede mostrar en la app y en el PDF.
 */

// Cualquier lado de la foto se reduce hasta este maximo (suficiente para
// pantalla y para el PDF, que las imprime como miniaturas).
const MAX_SIDE = 1800;
const JPEG_QUALITY = 0.85;

/** Reemplaza la extension del archivo por `.jpg` (mantiene el nombre original). */
function withJpgExtension(name) {
  const base = (name || 'foto').replace(/\.[^.]+$/, '');
  return `${base}.jpg`;
}

/** Carga el archivo como imagen que el navegador ya sepa dibujar. */
function loadImage(file) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('El navegador no pudo leer esta imagen'));
    };
    img.src = objectUrl;
  });
}

/**
 * Convierte la imagen a un JPG mas liviano. Si algo falla (un navegador viejo,
 * o un formato que ni el navegador puede abrir) devuelve el archivo original
 * tal cual, para que el servidor decida si lo acepta — asi este paso nunca
 * bloquea una subida que antes si funcionaba.
 *
 * @param {File} file archivo elegido por el usuario
 * @returns {Promise<File>} el archivo listo para subir
 */
export async function prepareImageForUpload(file) {
  if (!file) throw new Error('No se selecciono ninguna imagen');
  // Los PNG chicos (p.ej. las firmas dibujadas) se dejan igual: ya son
  // livianos y el PNG conserva el fondo transparente.
  if (file.type === 'image/png' && file.size <= 1024 * 1024) return file;

  try {
    const img = await loadImage(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
    const width = Math.max(1, Math.round(img.naturalWidth * scale));
    const height = Math.max(1, Math.round(img.naturalHeight * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    // Fondo blanco: si la imagen tiene transparencia (PNG/WEBP), al pasarla a
    // JPG el area transparente saldria negra.
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);

    const jpg = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY));
    if (!jpg) return file;
    return new File([jpg], withJpgExtension(file.name), { type: 'image/jpeg' });
  } catch (e) {
    return file;
  }
}

/**
 * Lista de tipos que se le pasa al `accept` de los `<input type="file">`.
 * `image/*` es lo que hace que el celular ofrezca la galeria y la camara con
 * cualquier formato; los demas se listan aparte porque algunos navegadores de
 * escritorio no filtran bien solo con `image/*`.
 */
export const IMAGE_ACCEPT =
  'image/*,image/jpeg,image/png,image/webp,image/gif,image/bmp,image/tiff,image/heic,image/heif,image/avif';
