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
// WebP pesa bastante menos que JPG con la misma calidad a la vista, asi que se
// puede subir un poco la calidad y aun asi mandar un archivo mas liviano.
const WEBP_QUALITY = 0.85;

// OJO CON EL FORMATO DE SALIDA: solo las imagenes que NO se imprimen en un PDF
// pueden ir en WebP. `pdfkit` (el que arma los PDF en el backend) unicamente
// sabe embeber JPEG y PNG: una foto de reporte en WebP saldria como un
// recuadro gris en el PDF del reporte. Por eso la foto de un articulo va en
// WebP (no entra a ningun PDF) y las de reporte siguen en JPG.
const FORMATOS = {
  jpg:  { mime: 'image/jpeg', extension: 'jpg',  calidad: JPEG_QUALITY },
  webp: { mime: 'image/webp', extension: 'webp', calidad: WEBP_QUALITY },
};

/** Reemplaza la extension del archivo por la del formato de salida (mantiene el nombre). */
function conExtension(name, extension) {
  const base = (name || 'foto').replace(/\.[^.]+$/, '');
  return `${base}.${extension}`;
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
 * Convierte la imagen a un archivo mas liviano (JPG por defecto, WebP si se
 * pide). Si algo falla (un navegador viejo, o un formato que ni el navegador
 * puede abrir) devuelve el archivo original tal cual, para que el servidor
 * decida si lo acepta — asi este paso nunca bloquea una subida que antes si
 * funcionaba.
 *
 * @param {File} file archivo elegido por el usuario
 * @param {'jpg'|'webp'} formato formato de salida (ver FORMATOS arriba: WebP
 *        solo para imagenes que NO se imprimen en un PDF)
 * @returns {Promise<File>} el archivo listo para subir
 */
export async function prepareImageForUpload(file, formato = 'jpg') {
  if (!file) throw new Error('No se selecciono ninguna imagen');
  const salida = FORMATOS[formato] || FORMATOS.jpg;
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

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, salida.mime, salida.calidad));
    if (!blob) return file;
    // Un navegador que no sepa exportar el formato pedido no avisa: devuelve un
    // PNG con otro tipo. Si eso pasa se reintenta en JPG, que sabe hacer
    // cualquiera -- lo importante es que el archivo que se sube sea realmente
    // del tipo que se le declara al servidor al pedir la URL firmada.
    if (blob.type !== salida.mime) {
      return salida.mime === 'image/jpeg' ? file : prepareImageForUpload(file, 'jpg');
    }
    return new File([blob], conExtension(file.name, salida.extension), { type: salida.mime });
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
