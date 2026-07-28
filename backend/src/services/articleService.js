// Este archivo maneja los ARTICULOS del inventario (repuestos, mano de obra, etc.):
// ver la lista, ver el detalle de uno, crear uno nuevo, editarlo o eliminarlo.
// Aqui no se guarda nada directo en la base de datos: eso lo hace articleRepository;
// este archivo solo decide las reglas (por ejemplo, avisar si el articulo no existe).
import * as articleRepository from '../repositories/articleRepository.js';
import * as articlePieceRepository from '../repositories/articlePieceRepository.js';
import * as articleLaborRepository from '../repositories/articleLaborRepository.js';
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
// Crea un articulo nuevo con los datos recibidos. "pieces"/"labor" (listas simples de
// nombres) no son columnas de "articles" -- viven en sus propias tablas
// (article_pieces/article_labor), asi que se separan del resto y se guardan aparte.
export async function create({ pieces, labor, ...data }) {
  const article = await articleRepository.create(data);
  if (pieces !== undefined) await articlePieceRepository.replaceForArticle(article.id, pieces);
  if (labor !== undefined) await articleLaborRepository.replaceForArticle(article.id, labor);
  return articleRepository.findById(article.id);
}
// Edita un articulo existente. Primero confirma que exista, para no editar algo que no esta.
export async function update(id, { pieces, labor, ...patch }) {
  const existing = await articleRepository.findById(id);
  if (!existing) throw new ApiError(404, 'Articulo no encontrado');
  await articleRepository.update(id, patch);
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
