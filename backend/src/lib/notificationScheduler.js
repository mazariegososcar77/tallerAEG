/**
 * En palabras simples: este archivo es el "despertador" del sistema. Una vez
 * al dia revisa si hay algo que avisar (articulos con poco stock,
 * mantenimientos por vencer, cotizaciones que se van a pasar de fecha) y manda
 * esos avisos.
 *
 * Por que el reloj vive aqui y no en n8n: del lado de n8n hay un unico webhook
 * que recibe un correo ya armado y lo manda, sin credenciales. Para que n8n
 * preguntara "¿que hay pendiente?" habria que abrirle un endpoint del sistema
 * hacia afuera y repartirle una clave. Es mas simple que el sistema, que ya
 * esta corriendo todo el dia, se acuerde solo.
 *
 * No usa ninguna libreria de tareas programadas (`node-cron` y compania): para
 * "una vez al dia a tal hora" alcanza con revisar el reloj cada tanto, y asi el
 * backend no suma una dependencia mas.
 *
 * Es seguro que corra de mas. Si el servidor se reinicia tres veces en la hora
 * señalada, la revision corre tres veces pero **los correos no se duplican**:
 * `notifications_log` recuerda lo que ya se aviso (ver notificationService).
 */
import * as notificationService from '../services/notificationService.js';
import * as settingsService from '../services/settingsService.js';

// Cada cuanto se asoma al reloj. No es cada cuanto se mandan los avisos: es
// cada cuanto revisa si ya es la hora. 10 minutos es suficientemente fino para
// no correrse de la hora configurada y suficientemente espaciado para no pesar.
const INTERVALO_MS = 10 * 60 * 1000;

// Ultima hora en la que ya se corrio, como texto "2026-09-09T07". Evita repetir
// la revision en cada tic dentro de la misma hora. Vive en memoria a proposito:
// si el servidor se reinicia y vuelve a correr, la deduplicacion de la base
// impide que se manden correos repetidos.
let ultimaCorrida = null;
let temporizador = null;

/** "2026-09-09T07" — identifica una hora concreta de un dia concreto. */
function claveHora(fecha) {
  const p = (n) => String(n).padStart(2, '0');
  return `${fecha.getFullYear()}-${p(fecha.getMonth() + 1)}-${p(fecha.getDate())}T${p(fecha.getHours())}`;
}

/**
 * Corre la revision y deja constancia en la consola de que se hizo. Se usa
 * tanto desde el temporizador como desde el boton "Revisar ahora".
 */
export async function revisarYAvisar(origen = 'programado') {
  const resumen = await notificationService.runScheduledChecks();
  // Solo se comenta en la consola lo que de verdad paso: si los tres avisos
  // estaban apagados o no habia nada pendiente, no tiene sentido ensuciar el
  // log del servidor todos los dias.
  const interesantes = resumen.resultados.filter(
    (r) => r.estado === 'enviado' || r.estado === 'fallo_envio' || r.estado === 'error',
  );
  for (const r of interesantes) {
    const detalle = r.estado === 'enviado' ? `${r.count} pendiente(s)` : (r.detalle || '');
    console.log(`[notificaciones:${origen}] ${r.label}: ${r.estado} ${detalle}`.trim());
  }
  return resumen;
}

// Un tic del reloj: ¿ya es la hora configurada y no se ha corrido en esta hora?
async function tic() {
  let hora;
  try {
    const settings = await settingsService.getSettings();
    hora = settings.notif_daily_hour;
  } catch (e) {
    // La base puede estar arrancando todavia. Se reintenta en el siguiente tic.
    return;
  }

  const ahora = new Date();
  if (ahora.getHours() !== hora) return;

  const clave = claveHora(ahora);
  if (ultimaCorrida === clave) return;
  ultimaCorrida = clave;

  try {
    await revisarYAvisar('programado');
  } catch (e) {
    // Igual que en el resto del modulo: un fallo avisando no puede tumbar el
    // servidor. Se anota y se vuelve a intentar mañana.
    console.error('[notificaciones] la revision diaria fallo:', e.message);
  }
}

/**
 * Arranca el despertador. Se llama desde `server.js` y no desde `app.js` a
 * proposito: asi importar la app (una prueba, un script) no deja temporizadores
 * corriendo por detras.
 */
export function iniciarProgramador() {
  if (temporizador) return temporizador;
  temporizador = setInterval(() => { tic(); }, INTERVALO_MS);
  // `unref` deja que el proceso termine aunque el temporizador siga vivo: sin
  // esto, un Ctrl+C tendria que esperar hasta 10 minutos para cerrar.
  temporizador.unref?.();
  return temporizador;
}

/** Detiene el despertador (lo usan las pruebas). */
export function detenerProgramador() {
  if (temporizador) clearInterval(temporizador);
  temporizador = null;
  ultimaCorrida = null;
}
