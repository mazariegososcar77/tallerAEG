/**
 * Utilidades para los PDF que genera el servidor (cotizaciones, ordenes de
 * trabajo, ordenes de servicio, reportes y facturas).
 *
 * Todos esos PDF se piden a un endpoint protegido (hay que mandar el token de
 * la sesion), asi que no se pueden abrir con un `<a href>` normal: primero se
 * descargan en memoria (un "blob") y de ahi se muestran o se guardan. Antes
 * cada pantalla repetia ese mismo codigo; ahora todas usan estas dos funciones.
 */
import { getToken } from './authStorage.js';

/**
 * Pide el PDF al servidor y lo devuelve como blob (archivo en memoria).
 * `url` es la ruta del endpoint, p.ej. `/api/invoices/12/pdf`.
 */
export async function fetchPdfBlob(url) {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${getToken()}` } });
  if (!res.ok) throw new Error('No se pudo generar el PDF');
  const blob = await res.blob();
  // Algunos navegadores devuelven el blob sin tipo; forzarlo a PDF es lo que
  // hace que el visor del navegador lo muestre en vez de bajarlo.
  return blob.type === 'application/pdf' ? blob : new Blob([blob], { type: 'application/pdf' });
}

/**
 * Descarga el PDF al dispositivo del usuario con el nombre indicado.
 * `fileName` puede venir sin la extension; se agrega `.pdf` si falta.
 */
export async function downloadPdf(url, fileName) {
  const blob = await fetchPdfBlob(url);
  saveBlob(blob, fileName);
}

/**
 * Guarda un blob ya descargado como archivo (lo usa el boton "Descargar" del
 * visor de PDF, que ya tiene el blob en pantalla y no necesita volver a pedirlo).
 */
export function saveBlob(blob, fileName) {
  const name = fileName.toLowerCase().endsWith('.pdf') ? fileName : `${fileName}.pdf`;
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = objectUrl;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Se revoca en el siguiente ciclo: si se hace de inmediato, algunos
  // navegadores cancelan la descarga que acaba de empezar.
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}
