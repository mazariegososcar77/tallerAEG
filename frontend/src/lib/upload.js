/**
 * Sube un archivo directo a Google Cloud Storage, sin que pase por el servidor.
 *
 * El problema que resuelve: antes cada foto viajaba al backend, que la recibia
 * entera y la guardaba en su disco. La VM de produccion tiene 1.9 GB de RAM
 * sosteniendo dos bases de datos, asi que hacerle pasar por encima cada foto de
 * cada reporte era justo lo que habia que quitar.
 *
 * Como funciona ahora, en dos pasos:
 *   1. Se le pide permiso al backend ("voy a subir una foto de reporte, de este
 *      tipo y este tamano"). El backend revisa permisos y devuelve una URL
 *      firmada, valida por unos minutos, y la ruta con la que el archivo va a
 *      quedar guardado.
 *   2. El navegador sube el archivo a esa URL con un PUT. Despues se le manda
 *      al backend solo la RUTA, que es lo unico que se guarda en la base.
 *
 * Si el sistema todavia no tiene configurado el almacenamiento en la nube, el
 * backend responde `modo: 'local'` y estas funciones devuelven `null`: quien
 * llama entiende que debe subir por el camino viejo (multipart contra el
 * backend), que sigue funcionando igual. Es lo que permite trabajar en una
 * maquina de desarrollo sin credenciales de Google.
 */
import { client } from '../api/client.js';

// Tipo de archivo segun la extension, para cuando el navegador no lo declara.
// Pasa sobre todo en celulares y con archivos que llegan por WhatsApp: mandan
// el archivo con el tipo vacio, y el backend necesita saber que es para poder
// firmar la subida.
const TIPO_POR_EXTENSION = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp',
  gif: 'image/gif', bmp: 'image/bmp', tif: 'image/tiff', tiff: 'image/tiff',
  heic: 'image/heic', heif: 'image/heif',
  pdf: 'application/pdf', txt: 'text/plain', csv: 'text/csv',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

/** Tipo de un archivo: el que declara el navegador o, si no dice nada, el de su extension. */
export function tipoDeArchivo(file) {
  if (file?.type) return file.type;
  const ext = (file?.name || '').split('.').pop()?.toLowerCase();
  return TIPO_POR_EXTENSION[ext] || '';
}

/**
 * Sube el archivo a la URL firmada.
 *
 * Se usa XMLHttpRequest y NO el cliente Axios del sistema a proposito, por dos
 * razones: el cliente le pega la cabecera `Authorization` a todas las llamadas y
 * Google rechaza una URL firmada que ademas traiga esa cabecera; y XHR es lo
 * unico que reporta el avance de la subida, que en el celular de un taller (con
 * senal irregular) es la diferencia entre "esta subiendo" y "se colgo".
 */
function subirConProgreso(url, file, contentType, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url, true);
    xhr.setRequestHeader('Content-Type', contentType);
    xhr.upload.onprogress = (e) => {
      if (onProgress && e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) return resolve();
      reject(new Error('No se pudo subir el archivo. Intenta de nuevo.'));
    };
    xhr.onerror = () => reject(new Error('No se pudo subir el archivo. Revisa tu conexión.'));
    xhr.onabort = () => reject(new Error('La subida se canceló.'));
    xhr.send(file);
  });
}

/**
 * Sube un archivo y devuelve la ruta con la que quedo guardado, o `null` si el
 * sistema todavia guarda en el disco del servidor (y entonces hay que usar el
 * camino multipart de siempre).
 *
 * @param {File}   file       archivo ya preparado (ver lib/image.js)
 * @param {string} entidad    'articulos' | 'reportes' | 'firmas' | 'documentos'
 * @param {Function} onProgress  recibe el avance de 0 a 100
 * @param {string} endpoint   solo lo cambia la pantalla publica de firma, que
 *                            se autoriza con su token y no con una sesion
 */
export async function subirArchivo(file, { entidad, onProgress, endpoint = '/uploads/signed-url' } = {}) {
  const contentType = tipoDeArchivo(file);
  if (!contentType) throw new Error('No se pudo reconocer el tipo de este archivo');

  const permiso = await client.post(endpoint, {
    ...(entidad ? { entidad } : {}),
    content_type: contentType,
    size_bytes: file.size,
  }).then((r) => r.data);

  // El sistema todavia guarda en el disco del servidor: que suba por el camino viejo.
  if (permiso?.modo !== 'gcs') return null;

  onProgress?.(0);
  await subirConProgreso(permiso.url_subida, file, permiso.content_type, onProgress);
  onProgress?.(100);
  return permiso.ruta_objeto;
}
