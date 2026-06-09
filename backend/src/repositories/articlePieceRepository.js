/** Acceso a datos de las piezas de un articulo. Unico punto que conoce el origen (hoy JSON). */
import { readCollection, writeCollection, nextId, now } from '../lib/jsonStore.js';

const COLLECTION = 'article_pieces';

/** Piezas de un articulo, en orden de insercion. */
export function getByArticleId(articleId) {
  const aid = Number(articleId);
  return readCollection(COLLECTION).filter((p) => p.article_id === aid);
}

/**
 * Reemplaza por completo las piezas de un articulo por la lista de nombres dada.
 * Borra las existentes y vuelve a insertar (sincronizacion simple).
 */
export function replaceForArticle(articleId, names) {
  const aid = Number(articleId);
  const rows = readCollection(COLLECTION).filter((p) => p.article_id !== aid);
  const timestamp = now();
  for (const raw of names) {
    const name = String(raw).trim();
    if (!name) continue;
    rows.push({
      id: nextId(rows),
      article_id: aid,
      name,
      created_at: timestamp,
      updated_at: timestamp,
    });
  }
  writeCollection(COLLECTION, rows);
}

/** Borra todas las piezas de un articulo (al eliminar el articulo). */
export function removeByArticleId(articleId) {
  const aid = Number(articleId);
  const rows = readCollection(COLLECTION);
  const next = rows.filter((p) => p.article_id !== aid);
  if (next.length !== rows.length) writeCollection(COLLECTION, next);
}
