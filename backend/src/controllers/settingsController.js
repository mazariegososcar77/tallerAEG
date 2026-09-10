// Este archivo recibe las peticiones web de la CONFIGURACION GENERAL del
// sistema (pantalla Configuracion > Configuracion general): leerla y guardarla.
import * as settingsService from '../services/settingsService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// Devuelve los ajustes. La app lo llama al iniciar sesion para aplicar los
// colores y el tema por defecto, asi que cualquier usuario con sesion lo puede
// leer -- pero no entero: los ajustes de administracion (la URL del webhook de
// n8n y las listas de correo de las notificaciones) solo salen con el permiso
// `settings.view`. Ver SENSITIVE_SETTING_KEYS en el service: esa URL no tiene
// credenciales del otro lado, asi que entregarsela a todos equivale a repartir
// la llave del correo del taller.
export const get = asyncHandler(async (req, res) => {
  const settings = await settingsService.getSettings();
  const puedeVerTodo = (req.user?.permissions || []).includes('settings.view');
  res.json(puedeVerTodo ? settings : settingsService.stripSensitive(settings));
});

// Guarda los ajustes que el administrador cambio y devuelve la configuracion
// completa ya actualizada (para que el frontend la aplique de inmediato).
export const update = asyncHandler(async (req, res) => {
  res.json(await settingsService.updateSettings(req.body));
});
