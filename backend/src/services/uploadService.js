/**
 * En palabras simples: aqui se decide COMO se va a subir un archivo y se
 * entrega el "permiso de subida" al navegador.
 *
 * Antes, cada foto viajaba al backend y el backend la guardaba en su disco.
 * Ahora el navegador le pregunta primero a esta capa: ella revisa que el
 * usuario tenga permiso, que el tipo y el tamano sean aceptables, y devuelve
 * una URL firmada para que el navegador suba el archivo DIRECTO a Google Cloud
 * Storage. El archivo nunca pasa por el servidor -- que es justo lo que habia
 * que lograr con 1.9 GB de RAM en la VM.
 *
 * Si el almacenamiento en la nube no esta configurado (`GCS_BUCKET` vacio),
 * responde `modo: 'local'` y el frontend vuelve solo al camino de siempre
 * (multipart contra el backend). Asi se puede trabajar sin credenciales de
 * Google y el dia del despliegue nada se rompe.
 */
import * as gcs from '../lib/gcsStorage.js';
import { ApiError } from '../utils/ApiError.js';

// Tipo de archivo que declara el navegador -> extension con la que se guarda.
// Se decide aqui y no con el nombre del archivo: el nombre lo elige el usuario
// y puede traer cualquier cosa.
const EXTENSION_POR_TIPO = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/pjpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/bmp': 'bmp',
  'image/tiff': 'tif',
  'image/heic': 'heic',
  'image/heif': 'heif',
  'application/pdf': 'pdf',
  'text/plain': 'txt',
  'text/csv': 'csv',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.ms-excel': 'xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
};

/**
 * Que se puede subir directo al bucket, con que permiso y hasta que tamano.
 *
 * El video del reporte NO esta aqui a proposito: es el unico archivo que sigue
 * pasando por el backend, porque hay que medirlo y comprimirlo con ffmpeg
 * antes de guardarlo (ver workReportService.setVideo).
 */
const REGLAS = {
  // Foto de un articulo del inventario. WebP permitido: esta imagen no entra a
  // ningun PDF, asi que puede usar el formato mas liviano.
  articulos: {
    permisos: ['articles.create', 'articles.update'],
    maxMB: 12,
  },
  // Foto de una etapa/categoria de un reporte de trabajo. Solo JPEG/PNG: estas
  // fotos SI se imprimen en el PDF del reporte y pdfkit unicamente sabe
  // embeber esos dos formatos (un WebP saldria como recuadro gris).
  reportes: {
    permisos: ['work-reports.update'],
    maxMB: 12,
  },
  // Firma dibujada a mano. PNG obligatorio: necesita fondo transparente.
  firmas: {
    permisos: ['work-reports.update', 'service-orders.update'],
    maxMB: 4,
  },
  // Papeleria de terceros adjunta a una orden (PDF, Word, Excel, una foto).
  documentos: {
    permisos: ['work-order-documents.manage'],
    maxMB: 20,
  },
};

/** ¿Estamos guardando en la nube o en el disco del servidor? */
export function modo() {
  return gcs.estaConfigurado() ? 'gcs' : 'local';
}

/**
 * Revisa tipo y tamano y devuelve la extension con la que se guardaria el
 * archivo. Se separa de `crearSubida` porque el enlace publico de firma
 * (sin sesion) necesita lo mismo pero sin revisar permisos.
 */
function validar(entidad, contentType, sizeBytes) {
  const regla = REGLAS[entidad];
  if (!regla) throw new ApiError(400, `Tipo de archivo no soportado: ${entidad}`);

  const extension = EXTENSION_POR_TIPO[String(contentType || '').toLowerCase()];
  if (!extension || !gcs.ENTIDADES[entidad].extensiones.includes(extension)) {
    throw new ApiError(400, `Tipo de archivo no permitido aqui: ${contentType || 'desconocido'}`);
  }

  const size = Number(sizeBytes);
  if (!Number.isFinite(size) || size <= 0) {
    throw new ApiError(400, 'No se recibio el tamano del archivo');
  }
  if (size > regla.maxMB * 1024 * 1024) {
    throw new ApiError(400, `El archivo excede ${regla.maxMB} MB`);
  }
  return extension;
}

/**
 * Entrega la URL firmada de subida y la ruta con la que ese archivo va a
 * quedar guardado en la base.
 *
 * Ojo con lo que esta funcion NO hace: no verifica que el usuario tenga
 * permiso sobre EL RECURSO puntual (este reporte, esta orden). Eso se revisa
 * en el momento de guardar la ruta en la base -- que es el paso que realmente
 * cambia algo -- porque una URL firmada que nadie llega a usar solo deja un
 * archivo suelto en el bucket, no un dato mal escrito.
 */
export async function crearSubida({ entidad, content_type, size_bytes }, permisos = []) {
  if (modo() === 'local') return { modo: 'local' };

  const regla = REGLAS[entidad];
  if (!regla) throw new ApiError(400, `Tipo de archivo no soportado: ${entidad}`);
  if (!regla.permisos.some((p) => permisos.includes(p))) {
    throw new ApiError(403, 'No tienes permiso para subir este tipo de archivo');
  }

  const extension = validar(entidad, content_type, size_bytes);
  const rutaObjeto = gcs.construirRutaObjeto(entidad, extension);
  const { url, expiraEn } = await gcs.firmarSubida(rutaObjeto, content_type);
  return { modo: 'gcs', url_subida: url, ruta_objeto: rutaObjeto, content_type, expira_en: expiraEn };
}

/**
 * Igual que `crearSubida`, pero para el enlace publico de firma remota: ahi no
 * hay sesion ni permisos, la autorizacion es el token largo de la URL (que
 * quien llama ya verifico contra la base). Solo firmas, y solo PNG.
 */
export async function crearSubidaFirmaPublica({ content_type, size_bytes }) {
  if (modo() === 'local') return { modo: 'local' };
  const extension = validar('firmas', content_type, size_bytes);
  const rutaObjeto = gcs.construirRutaObjeto('firmas', extension);
  const { url, expiraEn } = await gcs.firmarSubida(rutaObjeto, content_type);
  return { modo: 'gcs', url_subida: url, ruta_objeto: rutaObjeto, content_type, expira_en: expiraEn };
}

/**
 * Confirma que una ruta que mando el navegador se puede guardar en la base:
 * que tenga la forma correcta, que sea de la entidad que dice ser y que el
 * archivo exista de verdad en el bucket.
 *
 * Lo primero es seguridad (sin eso, cualquiera con sesion podria mandar como
 * "foto de mi reporte" la ruta del documento de otra orden y conseguir que el
 * sistema se la firme); lo ultimo evita filas que apuntan a la nada porque la
 * subida al bucket fallo a medias.
 */
export async function confirmarRuta(rutaObjeto, entidad) {
  if (modo() === 'local') {
    // Llega una ruta de la nube en un sistema que guarda en disco: pasa si alguien
    // deja el navegador abierto y mientras tanto se apaga GCS_BUCKET.
    throw new ApiError(400, 'El almacenamiento en la nube no esta configurado. Vuelve a cargar la pagina e intenta de nuevo.');
  }
  if (!gcs.validarRutaObjeto(rutaObjeto, entidad)) {
    throw new ApiError(400, 'La ruta del archivo no es valida');
  }
  if (!(await gcs.existeObjeto(rutaObjeto))) {
    throw new ApiError(400, 'El archivo no llego a subirse. Intenta de nuevo.');
  }
  return rutaObjeto;
}
