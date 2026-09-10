// Este archivo maneja las NOTIFICACIONES automaticas (Configuracion >
// Notificaciones). Ojo: los avisos en si no se prenden/apagan aqui sino en
// `settingsApi` — son ajustes del sistema como cualquier otro. Lo que vive en
// este archivo es lo que NO es configuracion: el historial de lo enviado y el
// aviso de prueba.
import { client } from './client.js';

export const notificationsApi = {
  // Ultimos avisos que se mandaron (requiere el permiso settings.view).
  log:  (limit = 20) => client.get('/notifications/log', { params: { limit } }).then(r => r.data),
  // Manda un aviso de prueba por el webhook de n8n, para comprobar que la URL
  // quedo bien puesta (requiere settings.update).
  test: (email)      => client.post('/notifications/test', { email }).then(r => r.data),
  // Corre ya mismo la revision diaria (stock, mantenimientos, cotizaciones por
  // vencer) sin esperar a que sea la hora. Es segura de repetir: lo que ya se
  // aviso no se vuelve a mandar (requiere settings.update).
  run:  ()           => client.post('/notifications/run').then(r => r.data),
};
