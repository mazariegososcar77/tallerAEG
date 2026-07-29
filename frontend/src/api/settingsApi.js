// Este archivo maneja la configuracion general del sistema (colores de marca,
// tema por defecto, datos del taller que salen en los PDF, vigencia de las
// cotizaciones). Se edita en Configuracion > Configuracion general.
import { client } from './client.js';

export const settingsApi = {
  // Trae todos los ajustes. Cualquier usuario con sesion puede leerlos, porque
  // los colores y el tema se le aplican a todos.
  get:    ()        => client.get('/settings').then(r => r.data),
  // Guarda solo los ajustes que se le manden (requiere el permiso settings.update).
  update: (payload) => client.put('/settings', payload).then(r => r.data),
};
