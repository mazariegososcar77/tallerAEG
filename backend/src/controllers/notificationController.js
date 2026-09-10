// Este archivo recibe las peticiones web de las NOTIFICACIONES automaticas
// (pantalla Configuracion > Notificaciones): ver el historial, mandar un aviso
// de prueba y forzar la revision diaria sin esperar a que sea la hora.
//
// Ojo: aqui NO hay ningun endpoint para n8n. Los avisos los empuja el sistema
// hacia el webhook de n8n; n8n nunca le pregunta nada al sistema, asi que no
// hace falta abrirle ninguna direccion ni darle una clave.
import * as notificationService from '../services/notificationService.js';
import { revisarYAvisar } from '../lib/notificationScheduler.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// Historial reciente para la pantalla de Configuracion.
export const log = asyncHandler(async (req, res) => {
  const limit = Math.min(Number.parseInt(req.query.limit, 10) || 20, 100);
  res.json(await notificationService.recentLog(limit));
});

// Aviso de prueba: sirve para saber si la URL del webhook quedo bien puesta
// sin tener que esperar a que baje el stock de algo.
export const test = asyncHandler(async (req, res) => {
  res.json(await notificationService.sendTest(req.body?.email));
});

// Corre ya mismo la revision que normalmente ocurre una vez al dia. Es segura
// de repetir: lo que ya se aviso no se vuelve a mandar.
export const run = asyncHandler(async (_req, res) => {
  res.json(await revisarYAvisar('manual'));
});
