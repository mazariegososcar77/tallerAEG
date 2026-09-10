// Este archivo recibe las peticiones web relacionadas a los DOCUMENTOS ADJUNTOS de
// una orden de trabajo: verlos, subir uno nuevo, borrarlo y confirmar que ya se
// revisaron (el paso obligatorio antes de facturar).
import * as workOrderDocumentService from '../services/workOrderDocumentService.js';
import { resolverCampos } from '../lib/mediaUrl.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// El archivo puede estar en la nube o en el disco de siempre; esto lo deja como una
// direccion que el navegador pueda abrir (ver lib/mediaUrl.js).
const conArchivo = (datos) => resolverCampos(datos, ['file_url']);

// Cuando el usuario abre la seccion "Documentos" de una orden, esto trae la lista.
export const list = asyncHandler(async (req, res) => {
  res.json(await conArchivo(await workOrderDocumentService.list(req.params.id)));
});

// Cuando el usuario adjunta un archivo con su titulo, esto lo guarda. El archivo llega
// ya subido a la nube (el body trae su ruta) o como multipart, segun este configurado
// el almacenamiento -- ver workOrderDocumentService.add.
export const add = asyncHandler(async (req, res) => {
  const doc = await workOrderDocumentService.add(req.params.id, req.body, req.file, req.user.id);
  res.status(201).json(await conArchivo(doc));
});

// Cuando un administrador quita un documento ya subido.
export const remove = asyncHandler(async (req, res) => {
  await workOrderDocumentService.remove(req.params.id, req.params.documentId);
  res.status(204).end();
});

// Cuando el usuario confirma que ya reviso los documentos de la orden (haya subido
// archivos o haya confirmado que no hay ninguno). Esto es lo que destraba la
// facturacion de esa orden.
export const review = asyncHandler(async (req, res) => {
  res.json(await workOrderDocumentService.markReviewed(req.params.id, req.user.id));
});
