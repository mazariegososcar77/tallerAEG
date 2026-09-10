/**
 * NOTIFICACIONES AUTOMATICAS.
 *
 * El sistema **no manda correos** (no hay SMTP en el backend). Lo que hace este
 * archivo es decidir *que* hay que avisar, *a quien* y con *que texto*, y
 * entregarselo ya redactado a **n8n**, que es quien lo envia.
 *
 * Todo sale del backend hacia n8n (un solo POST a `n8n_webhook_url`); n8n nunca
 * le pregunta nada al sistema. Eso es a proposito: del otro lado hay un unico
 * webhook "recibir y mandar correo", sin credenciales, y asi no hay que abrir
 * ningun endpoint del sistema hacia afuera ni repartir claves de API.
 *
 * Los avisos son de dos clases, segun que los dispara:
 *
 *   1. Por TIEMPO (dependen del calendario, no de una accion): stock bajo,
 *      mantenimientos y cotizaciones por vencer. Los revisa una vez al dia
 *      `lib/notificationScheduler.js`, a la hora que diga `notif_daily_hour`.
 *
 *   2. Por EVENTO (pasan cuando alguien hace algo): orden de trabajo creada y
 *      "enviar cotizacion por correo". Salen en el momento.
 *
 * Por que la deduplicacion vive aqui: si la revision corriera dos veces (un
 * reinicio del servidor, alguien apretando "Revisar ahora"), el mismo articulo
 * con stock bajo generaria dos correos. `notifications_log` (migracion 039) es
 * esa cuenta, y se escribe **despues** de que n8n confirma que recibio el
 * aviso, nunca antes.
 *
 * Regla de oro: **un fallo notificando nunca debe romper la operacion**. Si n8n
 * esta caido, la orden de trabajo igual se guarda. Por eso `emit()` atrapa todo
 * y solo deja rastro en la consola.
 */
import * as notificationRepository from '../repositories/notificationRepository.js';
import * as maintenanceRepository from '../repositories/maintenanceRepository.js';
import * as settingsService from '../services/settingsService.js';
import { ApiError } from '../utils/ApiError.js';

// Cuanto tiempo tiene que pasar para volver a avisar de lo MISMO. No es igual
// para todos a proposito: que un repuesto siga bajo es noticia diaria (hay que
// comprarlo), pero recordar todos los dias el mismo mantenimiento a 15 dias
// vista solo logra que dejen de leer los correos.
const VENTANA_HORAS = {
  low_stock:       24,
  maintenance_due: 24 * 7,
  quote_expiring:  24,
};

/** Los tres avisos por Cron, con la clave de configuracion de cada uno. */
export const CRON_TYPES = ['low_stock', 'maintenance_due', 'quote_expiring'];

// ---------------------------------------------------------------------------
// Utilidades de formato
// ---------------------------------------------------------------------------

const fmtQ = (n) => `Q ${Number(n || 0).toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtFecha = (d) => (d ? new Date(d).toLocaleDateString('es-GT', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-');

// Escapa el texto que se mete en el HTML del correo. Los nombres de articulos y
// clientes los escribe el usuario, asi que un "&" o un "<" no puede romper el
// correo (ni colar etiquetas).
function esc(v) {
  return String(v ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Arma la tabla HTML del correo. Se usan estilos en linea y no una hoja de
 * estilos porque los clientes de correo (Gmail, Outlook) descartan casi todo
 * lo que venga en un <style>.
 */
function tablaHtml(columnas, filas) {
  const th = columnas.map((c) => `<th style="text-align:left;padding:8px 10px;border-bottom:2px solid #164B2C;font-size:12px;text-transform:uppercase;color:#164B2C;">${esc(c.label)}</th>`).join('');
  const tr = filas.map((f, i) => {
    const fondo = i % 2 ? '#f6f7f6' : '#ffffff';
    const tds = columnas.map((c) => {
      const valor = c.value(f);
      const resalte = c.highlight?.(f) ? 'color:#b91c1c;font-weight:700;' : '';
      return `<td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;font-size:13px;${resalte}">${esc(valor)}</td>`;
    }).join('');
    return `<tr style="background:${fondo}">${tds}</tr>`;
  }).join('');
  return `<table cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%;font-family:Arial,Helvetica,sans-serif;"><thead><tr>${th}</tr></thead><tbody>${tr}</tbody></table>`;
}

/** Envoltura comun del correo: titulo, bajada, contenido y pie. */
function cuerpoHtml({ titulo, bajada, contenido, empresa }) {
  return `<div style="font-family:Arial,Helvetica,sans-serif;color:#111827;max-width:720px;">
  <div style="background:#164B2C;color:#fff;padding:14px 18px;border-radius:8px 8px 0 0;">
    <div style="font-size:11px;letter-spacing:1px;opacity:.8;">${esc(empresa)}</div>
    <div style="font-size:18px;font-weight:700;">${esc(titulo)}</div>
  </div>
  <div style="border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;padding:18px;">
    <p style="margin:0 0 14px;font-size:13px;color:#4b5563;">${esc(bajada)}</p>
    ${contenido}
    <p style="margin:18px 0 0;font-size:11px;color:#9ca3af;">
      Aviso automatico del sistema de ${esc(empresa)}. Se puede desactivar en Configuracion &gt; Notificaciones.
    </p>
  </div>
</div>`;
}

// Version en texto plano del mismo correo, para los clientes que no muestran
// HTML (y para que el correo no caiga en spam por venir solo en HTML).
function cuerpoTexto(titulo, lineas) {
  return [titulo, '', ...lineas].join('\n');
}

// ---------------------------------------------------------------------------
// Los tres avisos por Cron
// ---------------------------------------------------------------------------

async function pendientesStockBajo(settings) {
  const articulos = await notificationRepository.lowStockArticles();
  return articulos.map((a) => ({
    reference_type: 'article',
    reference_id: a.id,
    meta: { code: a.code, quantity: Number(a.quantity), min_stock: Number(a.min_stock) },
    row: a,
  }));
}

function correoStockBajo(items, settings) {
  const filas = items.map((i) => i.row);
  const contenido = tablaHtml([
    { label: 'Codigo',    value: (a) => a.code },
    { label: 'Articulo',  value: (a) => a.name },
    { label: 'Bodega',    value: (a) => a.warehouse_name || '-' },
    { label: 'Existencia', value: (a) => `${Number(a.quantity)} ${a.unit || ''}`.trim(), highlight: (a) => Number(a.quantity) <= 0 },
    { label: 'Punto de reorden', value: (a) => String(Number(a.min_stock)) },
  ], filas);
  return {
    subject: `[${settings.company_name}] Stock bajo: ${filas.length} articulo${filas.length > 1 ? 's' : ''}`,
    html: cuerpoHtml({
      titulo: 'Articulos en su punto de reorden',
      bajada: 'Estos articulos llegaron o bajaron del nivel minimo configurado en el inventario. Conviene reponerlos.',
      contenido,
      empresa: settings.company_name,
    }),
    text: cuerpoTexto('ARTICULOS EN SU PUNTO DE REORDEN', filas.map(
      (a) => `- ${a.code} ${a.name}: ${Number(a.quantity)} ${a.unit || ''} (minimo ${Number(a.min_stock)})`,
    )),
  };
}

async function pendientesMantenimiento(settings) {
  const filas = await maintenanceRepository.getUpcoming(settings.notif_maintenance_days);
  // getUpcoming trae todo lo que vence dentro del plazo, lo que incluye lo que
  // ya se paso de fecha (next_service menor a hoy). Los vencidos van primero
  // porque son los que de verdad urgen.
  const orden = { vencido: 0, proximo: 1, al_dia: 2 };
  filas.sort((a, b) => (orden[a.status] ?? 3) - (orden[b.status] ?? 3) || new Date(a.next_service) - new Date(b.next_service));
  return filas.map((m) => ({
    reference_type: 'maintenance',
    reference_id: m.id,
    meta: { status: m.status, next_service: m.next_service },
    row: m,
  }));
}

function correoMantenimiento(items, settings) {
  const filas = items.map((i) => i.row);
  const vencidos = filas.filter((m) => m.status === 'vencido').length;
  const contenido = tablaHtml([
    { label: 'Estado',   value: (m) => (m.status === 'vencido' ? 'VENCIDO' : 'Proximo'), highlight: (m) => m.status === 'vencido' },
    { label: 'Cliente',  value: (m) => m.client_name || '-' },
    { label: 'Maquina',  value: (m) => [m.machine_name, m.machine_brand].filter(Boolean).join(' ') || '-' },
    { label: 'Serie',    value: (m) => m.machine_serial || '-' },
    { label: 'Proximo servicio', value: (m) => fmtFecha(m.next_service), highlight: (m) => m.status === 'vencido' },
  ], filas);
  const resumen = vencidos
    ? `${vencidos} vencido${vencidos > 1 ? 's' : ''} y ${filas.length - vencidos} por vencer`
    : `${filas.length} por vencer`;
  return {
    subject: `[${settings.company_name}] Mantenimientos: ${resumen}`,
    html: cuerpoHtml({
      titulo: 'Mantenimientos programados',
      bajada: `Mantenimientos vencidos o que vencen en los proximos ${settings.notif_maintenance_days} dias.`,
      contenido,
      empresa: settings.company_name,
    }),
    text: cuerpoTexto('MANTENIMIENTOS PROGRAMADOS', filas.map(
      (m) => `- [${m.status === 'vencido' ? 'VENCIDO' : 'proximo'}] ${m.client_name || '-'} / ${m.machine_name || '-'}: ${fmtFecha(m.next_service)}`,
    )),
  };
}

async function pendientesCotizacionPorVencer(settings) {
  const filas = await notificationRepository.expiringQuotes(settings.notif_quote_expiring_days);
  return filas.map((q) => ({
    reference_type: 'quote',
    reference_id: q.id,
    meta: { number: q.number, valid_until: q.valid_until, days_left: q.days_left },
    row: q,
  }));
}

function correoCotizacionPorVencer(items, settings) {
  const filas = items.map((i) => i.row);
  const contenido = tablaHtml([
    { label: 'Cotizacion', value: (q) => `No. ${q.number}` },
    { label: 'Cliente',    value: (q) => q.client_name || '-' },
    { label: 'Trabajo',    value: (q) => q.work_type || '-' },
    { label: 'Total',      value: (q) => fmtQ(q.total) },
    { label: 'Valida hasta', value: (q) => fmtFecha(q.valid_until), highlight: (q) => Number(q.days_left) < 0 },
    { label: 'Dias',       value: (q) => (Number(q.days_left) < 0 ? `vencida hace ${Math.abs(q.days_left)}` : `faltan ${q.days_left}`), highlight: (q) => Number(q.days_left) < 0 },
  ], filas);
  return {
    subject: `[${settings.company_name}] ${filas.length} cotizacion${filas.length > 1 ? 'es' : ''} por vencer`,
    html: cuerpoHtml({
      titulo: 'Cotizaciones por vencer',
      bajada: 'Estas cotizaciones se enviaron al cliente y estan por pasarse de su fecha de vigencia sin respuesta. Vale la pena darles seguimiento.',
      contenido,
      empresa: settings.company_name,
    }),
    text: cuerpoTexto('COTIZACIONES POR VENCER', filas.map(
      (q) => `- No. ${q.number} ${q.client_name || '-'} ${fmtQ(q.total)}: vence ${fmtFecha(q.valid_until)}`,
    )),
  };
}

// Registro de los avisos por Cron: de donde salen los pendientes, como se
// redacta el correo y con que par de ajustes se prende/apaga.
const CRON = {
  low_stock: {
    label: 'Stock bajo',
    enabledKey: 'notif_low_stock_enabled',
    emailKey: 'notif_low_stock_email',
    pendientes: pendientesStockBajo,
    correo: correoStockBajo,
  },
  maintenance_due: {
    label: 'Mantenimientos proximos y vencidos',
    enabledKey: 'notif_maintenance_enabled',
    emailKey: 'notif_maintenance_email',
    pendientes: pendientesMantenimiento,
    correo: correoMantenimiento,
  },
  quote_expiring: {
    label: 'Cotizaciones por vencer',
    enabledKey: 'notif_quote_expiring_enabled',
    emailKey: 'notif_quote_expiring_email',
    pendientes: pendientesCotizacionPorVencer,
    correo: correoCotizacionPorVencer,
  },
};

/**
 * Revisa los tres avisos que dependen del calendario y manda los que toquen.
 *
 * La llama el programador una vez al dia y tambien el boton "Revisar ahora" de
 * la pantalla de Configuracion. Es **segura de repetir**: lo que ya se aviso
 * dentro de su ventana no se vuelve a mandar, asi que correrla de mas no
 * genera correos de mas.
 *
 * Devuelve un resumen de que paso con cada aviso — la pantalla lo muestra tal
 * cual, y el programador lo escribe en la consola del servidor.
 */
export async function runScheduledChecks() {
  const settings = await settingsService.getSettings();
  const resultados = [];

  for (const type of CRON_TYPES) {
    const def = CRON[type];

    if (!settings[def.enabledKey]) {
      resultados.push({ type, label: def.label, estado: 'apagado' });
      continue;
    }
    const destinatarios = settingsService.parseEmails(settings[def.emailKey]);
    if (!destinatarios.length) {
      resultados.push({ type, label: def.label, estado: 'sin_destinatario' });
      continue;
    }

    let items;
    try {
      const todos = await def.pendientes(settings);
      // Se descarta lo que ya se aviso dentro de la ventana de este tipo.
      const yaAvisados = await notificationRepository.alreadySent(type, VENTANA_HORAS[type]);
      items = todos.filter((i) => !yaAvisados.has(`${i.reference_type}:${i.reference_id}`));
    } catch (e) {
      // Que falle la consulta de un aviso no puede dejar sin revisar a los
      // otros dos: cada tipo se resuelve por su cuenta.
      console.error(`[notificaciones] fallo al revisar "${type}":`, e.message);
      resultados.push({ type, label: def.label, estado: 'error', detalle: e.message });
      continue;
    }

    if (!items.length) {
      resultados.push({ type, label: def.label, estado: 'nada_pendiente' });
      continue;
    }

    const { subject, html, text } = def.correo(items, settings);
    const envio = await emit(type, {
      to: destinatarios.join(', '),
      subject,
      html,
      text,
      count: items.length,
    });

    if (!envio.sent) {
      // Sin confirmacion de n8n NO se registra nada: el aviso queda pendiente
      // y se reintenta en la siguiente revision. Al reves (registrar primero)
      // un correo que nunca salio se daria por enviado para siempre.
      resultados.push({ type, label: def.label, estado: 'fallo_envio', detalle: envio.reason, count: items.length });
      continue;
    }

    await notificationRepository.logSent(items.map((i) => ({
      type,
      reference_type: i.reference_type,
      reference_id: i.reference_id,
      channel: 'email',
      meta: i.meta,
    })));

    resultados.push({ type, label: def.label, estado: 'enviado', count: items.length, to: destinatarios });
  }

  return { revisado_en: new Date().toISOString(), resultados };
}

// ---------------------------------------------------------------------------
// Avisos por evento (el backend le pega a n8n)
// ---------------------------------------------------------------------------

/**
 * Le avisa a n8n que paso algo, sin hacer esperar a quien disparo la accion.
 *
 * El mensaje se manda **plano a proposito** (`to`, `subject`, `html`, `text`,
 * y para la cotizacion `adjunto_*`), sin objetos anidados: del otro lado hay un
 * webhook simple, y asi cada dato se usa directo como `{{ $json.subject }}` sin
 * tener que escarbar. `to` es texto con los correos separados por coma, que es
 * justo lo que espera el campo "To" del nodo de correo.
 *
 * Tres decisiones importantes:
 *  - **Nunca lanza.** Guardar una orden de trabajo no puede fallar porque n8n
 *    no contesto. Un fallo aqui solo sale en la consola del servidor.
 *  - **No se espera la respuesta** en el flujo del usuario: quien llama puede
 *    ignorar la promesa y seguir.
 *  - **Corta a los 10 segundos**, para no dejar peticiones colgadas si el
 *    webhook quedo mal configurado.
 */
export async function emit(event, payload) {
  let url;
  try {
    const settings = await settingsService.getSettings();
    url = settings.n8n_webhook_url;
  } catch (e) {
    console.error('[notificaciones] no se pudo leer la configuracion:', e.message);
    return { sent: false, reason: 'settings_error' };
  }
  // Sin URL configurada no hay nada que hacer, y no es un error: es el estado
  // normal del sistema mientras no se conecte n8n.
  if (!url) return { sent: false, reason: 'sin_webhook' };

  const corte = AbortSignal.timeout ? AbortSignal.timeout(10000) : undefined;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, sent_at: new Date().toISOString(), ...payload }),
      signal: corte,
    });
    if (!res.ok) {
      console.error(`[notificaciones] n8n respondio ${res.status} al evento "${event}"`);
      return { sent: false, reason: `http_${res.status}` };
    }
    return { sent: true };
  } catch (e) {
    console.error(`[notificaciones] no se pudo avisar el evento "${event}":`, e.message);
    return { sent: false, reason: 'network_error' };
  }
}

/**
 * Aviso de orden de trabajo creada. Se llama desde workOrderService.create.
 * Solo sale si el aviso esta prendido y tiene destinatario, para que apagarlo
 * en la pantalla de Configuracion realmente lo apague.
 */
export async function emitWorkOrderCreated(order) {
  // Igual que emit(): este aviso jamas puede tumbar el guardado de la orden,
  // asi que ni siquiera un fallo leyendo la configuracion se propaga.
  let settings;
  try {
    settings = await settingsService.getSettings();
  } catch (e) {
    console.error('[notificaciones] no se pudo leer la configuracion:', e.message);
    return { sent: false, reason: 'settings_error' };
  }
  if (!settings.notif_work_order_created_enabled) return { sent: false, reason: 'apagado' };
  const to = settingsService.parseEmails(settings.notif_work_order_created_email);
  if (!to.length) return { sent: false, reason: 'sin_destinatario' };

  return emit('work_order_created', {
    to: to.join(', '),
    subject: `[${settings.company_name}] Orden de trabajo No. ${order.number} creada`,
    html: cuerpoHtml({
      titulo: `Orden de trabajo No. ${order.number}`,
      bajada: 'Se registro una orden de trabajo nueva en el sistema.',
      contenido: tablaHtml([
        { label: 'Dato', value: (f) => f.k },
        { label: 'Valor', value: (f) => f.v },
      ], [
        { k: 'Cliente',        v: order.client_name || '-' },
        { k: 'Equipo',         v: [order.equipment_name, order.brand, order.model].filter(Boolean).join(' ') || '-' },
        { k: 'Serie',          v: order.serial || '-' },
        { k: 'Trabajo',        v: order.work_type || order.observations || '-' },
        { k: 'Recibido',       v: fmtFecha(order.received_at || order.created_at) },
        { k: 'Entrega prevista', v: fmtFecha(order.delivery_at) },
      ]),
      empresa: settings.company_name,
    }),
    text: cuerpoTexto(`ORDEN DE TRABAJO No. ${order.number}`, [
      `Cliente: ${order.client_name || '-'}`,
      `Equipo: ${[order.equipment_name, order.brand, order.model].filter(Boolean).join(' ') || '-'}`,
      `Serie: ${order.serial || '-'}`,
      `Entrega prevista: ${fmtFecha(order.delivery_at)}`,
    ]),
    work_order: { id: order.id, number: order.number, client_name: order.client_name, status: order.status },
  });
}

/**
 * Manda la cotizacion por correo al cliente, con el PDF adjunto.
 *
 * A diferencia de los demas, este SI le importa a quien lo dispara (el usuario
 * apreto "Enviar por correo" y espera saber si salio), asi que aqui los
 * problemas si se reportan como error en vez de tragarselos.
 */
export async function sendQuoteEmail({ quote, email, pdfBase64, mensaje }) {
  const settings = await settingsService.getSettings();
  if (!settings.n8n_webhook_url) {
    throw new ApiError(400, 'No hay un webhook de n8n configurado. Se configura en Configuracion > Notificaciones.');
  }

  const filas = [
    { k: 'Cotizacion', v: `No. ${quote.number}` },
    { k: 'Fecha',      v: fmtFecha(quote.date) },
    { k: 'Valida hasta', v: fmtFecha(quote.valid_until) },
    { k: 'Total',      v: fmtQ(quote.total) },
  ];

  const resultado = await emit('quote_email', {
    to: email,
    subject: `${settings.company_name} - Cotizacion No. ${quote.number}`,
    html: cuerpoHtml({
      titulo: `Cotizacion No. ${quote.number}`,
      bajada: mensaje || `Adjunto encontrara la cotizacion solicitada. Cualquier duda, con gusto la atendemos.`,
      contenido: tablaHtml([
        { label: 'Dato', value: (f) => f.k },
        { label: 'Valor', value: (f) => f.v },
      ], filas),
      empresa: settings.company_name,
    }),
    text: cuerpoTexto(`COTIZACION No. ${quote.number}`, [
      mensaje || 'Adjunto encontrara la cotizacion solicitada.',
      '',
      ...filas.map((f) => `${f.k}: ${f.v}`),
    ]),
    // El PDF viaja en el mismo mensaje (en base64) para que n8n no tenga que
    // volver a pedirselo al sistema. Van como tres campos sueltos y no como un
    // objeto anidado para que el nodo que arma el archivo los tome directo.
    adjunto_nombre: `cotizacion-${quote.number}.pdf`,
    adjunto_tipo: 'application/pdf',
    adjunto_base64: pdfBase64,
    // Datos sueltos por si se quieren usar en el texto del correo.
    cotizacion_numero: quote.number,
    cliente: quote.client_name || '',
  });

  if (!resultado.sent) {
    throw new ApiError(502, 'No se pudo contactar a n8n para enviar el correo. Revisa la URL del webhook en Configuracion > Notificaciones.');
  }

  // Queda registrado igual que los avisos por Cron, para poder responder
  // despues "¿si se le mando la cotizacion al cliente y cuando?".
  await notificationRepository.logSent([{
    type: 'quote_email',
    reference_type: 'quote',
    reference_id: quote.id,
    channel: 'email',
    meta: { email, number: quote.number },
  }]);

  return { sent: true, email };
}

/** Aviso de prueba, para verificar desde la pantalla que n8n contesta. */
export async function sendTest(email) {
  const settings = await settingsService.getSettings();
  if (!settings.n8n_webhook_url) {
    throw new ApiError(400, 'Primero hay que guardar la URL del webhook de n8n.');
  }
  const destinatarios = settingsService.parseEmails(email);
  if (!destinatarios.length) throw new ApiError(400, 'Indica un correo para la prueba');

  const resultado = await emit('test', {
    to: destinatarios.join(', '),
    subject: `[${settings.company_name}] Prueba de notificaciones`,
    html: cuerpoHtml({
      titulo: 'Prueba de notificaciones',
      bajada: 'Si estas leyendo esto, la conexion entre el sistema y n8n funciona.',
      contenido: '',
      empresa: settings.company_name,
    }),
    text: 'Prueba de notificaciones: la conexion entre el sistema y n8n funciona.',
  });

  if (!resultado.sent) {
    throw new ApiError(502, `n8n no respondio correctamente (${resultado.reason}). Revisa la URL del webhook.`);
  }
  return resultado;
}

/** Historial reciente, para mostrarlo en la pantalla de Notificaciones. */
export async function recentLog(limit = 20) {
  return notificationRepository.recentLog(limit);
}
