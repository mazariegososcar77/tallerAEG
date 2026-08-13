// Este archivo maneja los ARTICULOS del inventario (repuestos, mano de obra, etc.):
// ver la lista, ver el detalle de uno, crear uno nuevo, editarlo o eliminarlo.
// Aqui no se guarda nada directo en la base de datos: eso lo hace articleRepository;
// este archivo solo decide las reglas (por ejemplo, avisar si el articulo no existe).
import { withTransaction } from '../lib/db.js';
import * as articleRepository from '../repositories/articleRepository.js';
import * as articlePieceRepository from '../repositories/articlePieceRepository.js';
import * as articleLaborRepository from '../repositories/articleLaborRepository.js';
import * as inventoryService from './inventoryService.js';
import { ApiError } from '../utils/ApiError.js';

// Devuelve todos los articulos, o solo los de un tipo si se indica typeId (ej: solo "repuestos").
export async function list(typeId = null) {
  return articleRepository.getAll(typeId);
}
// Busca un articulo por su id. Si no existe, avisa con un error "no encontrado".
export async function getById(id) {
  const a = await articleRepository.findById(id);
  if (!a) throw new ApiError(404, 'Articulo no encontrado');
  return a;
}
/**
 * Crea un articulo nuevo con los datos recibidos. "pieces"/"labor" (listas simples de
 * nombres) no son columnas de "articles" -- viven en sus propias tablas
 * (article_pieces/article_labor), asi que se separan del resto y se guardan aparte.
 *
 * La existencia inicial NO se escribe en la columna: el articulo nace en cero y, si se
 * indico una cantidad, esta entra por un movimiento 'saldo_inicial' del kardex. Asi
 * ninguna existencia del sistema aparece de la nada -- hasta la primera tiene una linea
 * que la explica. El alta y ese movimiento van en la misma transaccion: si el kardex
 * falla, el articulo tampoco se crea, porque un articulo con existencia que el kardex no
 * conoce es justo el descuadre que esto evita.
 *
 * `userId` es quien esta dando de alta el articulo: queda firmado en el movimiento de
 * apertura, para que el kardex diga quien declaro esa existencia inicial.
 */
export async function create({ pieces, labor, quantity, ...data }, userId = null) {
  // Un costo en blanco se guarda como NULL ("no capturado"), nunca como 0: un costo real
  // de cero es otra cosa. Hace falta aqui ademas del schema porque la carga masiva por
  // Excel entra por este mismo camino sin pasar por el (sus filas se validan aparte).
  if (data.cost === '' || data.cost === undefined) data.cost = null;

  const initialQuantity = Number(quantity) || 0;
  const articleId = await withTransaction(async (conn) => {
    const newId = await articleRepository.create(data, conn);
    if (initialQuantity > 0) {
      await inventoryService.openingBalance({
        articleId: newId,
        quantity: initialQuantity,
        unitCost: data.cost ?? null,
        userId,
        conn,
      });
    }
    return newId;
  });

  if (pieces !== undefined) await articlePieceRepository.replaceForArticle(articleId, pieces);
  if (labor !== undefined) await articleLaborRepository.replaceForArticle(articleId, labor);
  return articleRepository.findById(articleId);
}
/**
 * Edita un articulo existente. Primero confirma que exista, para no editar algo que no esta.
 *
 * `quantity` se descarta del patch: editar la ficha de un articulo nunca cambia su
 * existencia. La unica via son los movimientos del kardex (el consumo de un reporte, un
 * ajuste manual o el saldo inicial), que es lo que permite reconstruir despues por que un
 * articulo tiene el saldo que tiene. El schema de la ruta ya la quita del body; esto es el
 * segundo candado, para que ningun otro llamador (la carga masiva, un script, un
 * controller que se agregue manana) pueda colarla por aqui.
 */
export async function update(id, { pieces, labor, quantity, ...patch }) {
  const existing = await articleRepository.findById(id);
  if (!existing) throw new ApiError(404, 'Articulo no encontrado');
  if (patch.cost === '') patch.cost = null;
  if (Object.keys(patch).length > 0) await articleRepository.update(id, patch);
  if (pieces !== undefined) await articlePieceRepository.replaceForArticle(id, pieces);
  if (labor !== undefined) await articleLaborRepository.replaceForArticle(id, labor);
  return articleRepository.findById(id);
}
// Elimina un articulo. Primero confirma que exista.
export async function remove(id) {
  const existing = await articleRepository.findById(id);
  if (!existing) throw new ApiError(404, 'Articulo no encontrado');
  return articleRepository.remove(id);
}
