// Este archivo atiende las peticiones del navegador que piden "permiso para subir
// un archivo": devuelve una URL firmada con la que el navegador sube el archivo
// DIRECTO a Google Cloud Storage, sin que pase por el servidor.
import * as uploadService from '../services/uploadService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// Antes de subir una foto/documento, el frontend llama aqui. Si el sistema esta
// guardando en la nube devuelve la URL firmada y la ruta con la que quedara
// guardado; si no, responde `modo: 'local'` y el frontend sube por el camino de
// siempre (multipart contra el backend).
export const crearSubida = asyncHandler(async (req, res) => {
  const resultado = await uploadService.crearSubida(req.body, req.user.permissions);
  res.json(resultado);
});
