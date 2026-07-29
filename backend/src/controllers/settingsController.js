// Este archivo recibe las peticiones web de la CONFIGURACION GENERAL del
// sistema (pantalla Configuracion > Configuracion general): leerla y guardarla.
import * as settingsService from '../services/settingsService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// Devuelve todos los ajustes. La app lo llama al iniciar sesion para aplicar los
// colores y el tema por defecto, asi que cualquier usuario con sesion lo puede leer.
export const get = asyncHandler(async (_req, res) => {
  res.json(await settingsService.getSettings());
});

// Guarda los ajustes que el administrador cambio y devuelve la configuracion
// completa ya actualizada (para que el frontend la aplique de inmediato).
export const update = asyncHandler(async (req, res) => {
  res.json(await settingsService.updateSettings(req.body));
});
