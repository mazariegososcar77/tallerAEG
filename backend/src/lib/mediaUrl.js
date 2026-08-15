/**
 * En palabras simples: este archivo traduce lo que esta guardado en la base de
 * datos a una direccion que el navegador pueda abrir.
 *
 * Hace falta porque en las columnas de fotos/firmas/videos/documentos conviven
 * TRES formas distintas, y las tres tienen que seguir funcionando:
 *
 *   1. `/uploads/<archivo>`          -> archivo viejo, guardado en el disco del
 *                                       servidor. Se devuelve tal cual, igual
 *                                       que siempre.
 *   2. `https://...`                 -> una URL externa que alguien pego a mano
 *                                       (solo pasa en articles.image_url).
 *   3. `reportes/2026/08/<uuid>.jpg` -> ruta de un objeto en Google Cloud
 *                                       Storage. Se firma al vuelo y se
 *                                       devuelve una URL temporal.
 *
 * Esta convivencia es a proposito: permite desplegar el cambio a la nube ANTES
 * de mover un solo archivo, y migrar despues con calma. Una fila migrada y una
 * sin migrar se ven exactamente igual desde el frontend.
 *
 * REGLA QUE NO SE ROMPE: la URL firmada NUNCA se guarda en la base de datos.
 * En MySQL vive la ruta del objeto; la URL se genera en cada respuesta (con
 * cache en memoria, ver gcsStorage.js) y vence sola.
 */
import path from 'path';
import * as gcs from './gcsStorage.js';
import { UPLOADS_DIR } from '../middleware/upload.middleware.js';

/**
 * Traduce UN valor guardado a una direccion utilizable por el navegador.
 * Si el objeto ya no existe o Google responde con error, se devuelve el valor
 * original en vez de romper la respuesta entera: es preferible una imagen rota
 * que una pantalla que no carga.
 */
export async function resolverUrl(valor) {
  if (!valor) return valor;
  if (!gcs.esRutaObjeto(valor) || !gcs.estaConfigurado()) return valor;
  try {
    return await gcs.firmarLectura(valor);
  } catch (err) {
    console.warn(`[media] no se pudo firmar ${valor}: ${err.message}`);
    return valor;
  }
}

/**
 * Traduce varios campos de un objeto (o de una lista de objetos) de una sola
 * pasada. Devuelve copias: nunca modifica lo que le entregaron, porque el
 * mismo registro se usa despues para generar el PDF, donde hace falta la ruta
 * original y no la URL firmada.
 *
 *   const publico = await resolverCampos(articulo, ['image_url']);
 *   const publicos = await resolverCampos(articulos, ['image_url']);
 */
export async function resolverCampos(datos, campos) {
  if (!datos) return datos;
  if (Array.isArray(datos)) {
    return Promise.all(datos.map((fila) => resolverCampos(fila, campos)));
  }
  const copia = { ...datos };
  await Promise.all(campos.map(async (campo) => {
    copia[campo] = await resolverUrl(datos[campo]);
  }));
  return copia;
}

/**
 * Un reporte de trabajo completo: sus firmas, su video y la lista de fotos.
 * Se separa del resto porque es el unico que trae una lista anidada.
 */
export async function resolverReporte(report) {
  if (!report) return report;
  const copia = await resolverCampos(report, [
    'tech_signature_url', 'client_signature_url', 'final_video_url',
  ]);
  if (Array.isArray(report.photos)) {
    copia.photos = await resolverCampos(report.photos, ['photo_url']);
  }
  return copia;
}

/**
 * Deja en el disco del servidor los archivos que `pdfkit` necesita para armar
 * un PDF, y devuelve un mapa `valor guardado -> ruta local`.
 *
 * Es el unico lugar donde los bytes de una imagen vuelven a pasar por el
 * backend, y no hay como evitarlo: pdfkit embebe archivos, no URLs. Se baja en
 * streaming a un temporal del sistema (no a memoria) y se borra apenas el PDF
 * esta armado -- ver `limpiarLocales`.
 *
 * Los valores que ya son `/uploads/...` se resuelven contra el disco de
 * siempre, sin bajar nada.
 */
export async function prepararLocales(valores) {
  const mapa = new Map();
  const unicos = [...new Set((valores || []).filter(Boolean))];
  await Promise.all(unicos.map(async (valor) => {
    if (gcs.esRutaObjeto(valor)) {
      if (!gcs.estaConfigurado()) return;
      try {
        mapa.set(valor, await gcs.descargarATemporal(valor));
      } catch (err) {
        // Mismo criterio que ya tenia el generador de PDF con un archivo que
        // no esta en disco: se dibuja un recuadro gris y el PDF sale igual.
        console.warn(`[media] no se pudo bajar ${valor} para el PDF: ${err.message}`);
      }
      return;
    }
    if (typeof valor === 'string' && valor.startsWith('/uploads/')) {
      mapa.set(valor, path.join(UPLOADS_DIR, path.basename(valor)));
    }
  }));
  return mapa;
}

/** Borra los temporales que dejo `prepararLocales` (los de GCS, no los del disco propio). */
export async function limpiarLocales(mapa) {
  if (!mapa) return;
  const temporales = [...mapa.entries()]
    .filter(([valor]) => gcs.esRutaObjeto(valor))
    .map(([, ruta]) => ruta);
  await gcs.limpiarTemporales(temporales);
}

/**
 * Junta todos los valores de media de un reporte de trabajo (fotos + firmas),
 * que es lo que su PDF necesita bajar antes de dibujarse.
 */
export function valoresMediaReporte(report) {
  return [
    ...(report?.photos || []).map((p) => p.photo_url),
    report?.tech_signature_url,
    report?.client_signature_url,
  ].filter(Boolean);
}
