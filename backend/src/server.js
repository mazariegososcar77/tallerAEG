/**
 * En palabras simples: este es el archivo que se ejecuta para "prender" el
 * sistema — arranca el servidor y lo deja escuchando peticiones en el
 * puerto configurado (por defecto el 4000). Es lo que corre `npm run dev`
 * o `npm start`.
 *
 * Punto de entrada: arranca el servidor HTTP.
 */
import { createApp } from './app.js';
import { env } from './config/env.js';

const app = createApp();

// Pone al servidor a escuchar peticiones y muestra en la consola las
// direcciones utiles (la API, la documentacion Swagger y el healthcheck).
app.listen(env.port, () => {
  console.log('');
  console.log('=== Sistema Taller AEG - API ===');
  console.log(`Servidor:  http://localhost:${env.port}`);
  console.log(`Swagger:   http://localhost:${env.port}/api/docs`);
  console.log(`Health:    http://localhost:${env.port}/api/health`);
  console.log('================================');
  console.log('');
});
