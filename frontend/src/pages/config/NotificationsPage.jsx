// ============================================================================
// PANTALLA: Configuración → Notificaciones (/configuracion/notificaciones)
//
// Qué manda cada aviso y a quién. Importante para entender esta pantalla: el
// sistema NO envía correos — no tiene servidor de correo. Lo que hace es
// decidir qué hay que avisar y a quién, y el envío lo realiza **n8n**.
// De ahí que lo primero de la pantalla sea la URL del webhook: sin eso, los
// avisos inmediatos no salen de aquí.
//
// Todo sale del sistema hacia n8n por esa única URL — n8n nunca le pregunta
// nada de vuelta. Lo que cambia entre un aviso y otro es *qué lo dispara*:
//   - Por TIEMPO (stock bajo, mantenimientos, cotizaciones por vencer): los
//     revisa el propio sistema una vez al día, a la hora que se configure aquí.
//   - Por EVENTO (orden creada): sale en el momento en que alguien la guarda.
//
// El envío de una cotización por correo no se configura aquí: es una acción
// manual, con el correo que se escribe en el momento (botón "Enviar por correo"
// en Cotizaciones). Se menciona en la pantalla para que no se busque un
// interruptor que no existe.
//
// Los ajustes se guardan en `system_settings` como cualquier otro (mismo
// `useSettings` que Configuración general). Solo puede guardar quien tenga
// `settings.update`.
// ============================================================================
import { useEffect, useMemo, useState } from 'react';
import {
  BellRing, Save, Send, PackageMinus, CalendarClock, FileClock, ClipboardPlus,
  Webhook, History, Mail, RefreshCw, Clock,
} from 'lucide-react';
import { useSettings } from '../../hooks/useSettings.js';
import { useAuth } from '../../hooks/useAuth.js';
import { notify } from '../../lib/toast.js';
import { notificationsApi } from '../../api/notificationsApi.js';
import PageHeader from '../../components/common/PageHeader.jsx';
import Input from '../../components/ui/Input.jsx';
import Button from '../../components/ui/Button.jsx';
import Checkbox from '../../components/ui/Checkbox.jsx';
import Spinner from '../../components/ui/Spinner.jsx';

// Los cuatro avisos configurables. Se declaran como datos y no como JSX
// repetido cuatro veces para que agregar uno nuevo sea una entrada más aquí
// (y en SETTINGS_SCHEMA del backend), no otro bloque copiado y pegado.
const AVISOS = [
  {
    key: 'low_stock',
    icon: PackageMinus,
    titulo: 'Stock bajo',
    modo: 'diario',
    descripcion:
      'Avisa cuando un artículo llega o baja de su punto de reorden. Los artículos con punto de reorden en 0 no avisan (mano de obra, servicios).',
    enabledKey: 'notif_low_stock_enabled',
    emailKey: 'notif_low_stock_email',
    frecuencia: 'Un correo con todos los artículos que estén bajos. No se repite el mismo artículo antes de 24 horas.',
  },
  {
    key: 'maintenance_due',
    icon: CalendarClock,
    titulo: 'Mantenimientos próximos y vencidos',
    modo: 'diario',
    descripcion:
      'Avisa de los mantenimientos programados que están por vencer, y de los que ya se pasaron de fecha.',
    enabledKey: 'notif_maintenance_enabled',
    emailKey: 'notif_maintenance_email',
    diasKey: 'notif_maintenance_days',
    diasLabel: 'Avisar con esta anticipación (días)',
    diasHint: 'Los mantenimientos ya vencidos se incluyen siempre, sin importar este número.',
    frecuencia: 'No se repite el mismo mantenimiento antes de 7 días, para que no se vuelva ruido.',
  },
  {
    key: 'quote_expiring',
    icon: FileClock,
    titulo: 'Cotizaciones por vencer',
    modo: 'diario',
    descripcion:
      'Avisa de las cotizaciones enviadas al cliente que están por pasarse de su fecha de vigencia sin respuesta. Las aprobadas, rechazadas y las que siguen en borrador no entran.',
    enabledKey: 'notif_quote_expiring_enabled',
    emailKey: 'notif_quote_expiring_email',
    diasKey: 'notif_quote_expiring_days',
    diasLabel: 'Avisar con esta anticipación (días)',
    frecuencia: 'No se repite la misma cotización antes de 24 horas.',
  },
  {
    key: 'work_order_created',
    icon: ClipboardPlus,
    titulo: 'Orden de trabajo creada',
    modo: 'evento',
    descripcion:
      'Avisa en el momento en que se registra una orden de trabajo nueva, con los datos del equipo recibido.',
    enabledKey: 'notif_work_order_created_enabled',
    emailKey: 'notif_work_order_created_email',
    frecuencia: 'Un correo por cada orden creada.',
  },
];

// Nombre legible de los tipos que aparecen en el historial.
const TIPOS = {
  low_stock: 'Stock bajo',
  maintenance_due: 'Mantenimiento',
  quote_expiring: 'Cotización por vencer',
  work_order_created: 'Orden creada',
  quote_email: 'Cotización enviada',
  test: 'Prueba',
};

// A qué registro del sistema se refiere cada aviso. La interfaz va en español,
// así que no se imprimen los identificadores internos (`article`, `quote`, …).
const REFERENCIAS = {
  article: 'Artículo',
  maintenance: 'Mantenimiento',
  quote: 'Cotización',
  work_order: 'Orden',
  invoice: 'Factura',
};

const CANALES = { email: 'Correo' };

function Section({ icon: Icon, title, description, children }) {
  return (
    <section className="mb-4 rounded-xl border border-line bg-surface p-5">
      <div className="mb-4 flex items-start gap-3">
        <Icon size={18} className="mt-0.5 shrink-0 text-orange-500" />
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wide text-orange-500">{title}</h2>
          {description && <p className="mt-0.5 text-xs text-muted">{description}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

// Distintivo que dice si el aviso lo dispara el reloj o una acción del usuario.
function ModoBadge({ modo }) {
  const esCron = modo === 'diario';
  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
        esCron
          ? 'border-blue-500/40 bg-blue-500/10 text-blue-600'
          : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600'
      }`}
      title={esCron
        ? 'Se revisa una vez al día, a la hora configurada arriba'
        : 'Sale en el momento en que ocurre'}
    >
      {esCron ? 'Diario' : 'Inmediato'}
    </span>
  );
}

// Tarjeta de un aviso: interruptor, destinatarios y (si aplica) los días de
// anticipación. Se apaga visualmente cuando está desactivado.
function AvisoCard({ aviso, form, set, canEdit }) {
  const activo = !!form[aviso.enabledKey];
  const Icon = aviso.icon;
  const sinDestinatario = activo && !String(form[aviso.emailKey] || '').trim();

  return (
    <div className={`rounded-lg border p-4 transition-colors ${activo ? 'border-orange-500/40 bg-surface2' : 'border-line bg-surface2/50'}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <Icon size={18} className={`mt-0.5 shrink-0 ${activo ? 'text-orange-500' : 'text-muted'}`} />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold text-content">{aviso.titulo}</h3>
              <ModoBadge modo={aviso.modo} />
            </div>
            <p className="mt-1 text-xs text-muted">{aviso.descripcion}</p>
          </div>
        </div>
        <Checkbox
          checked={activo}
          onChange={(v) => set(aviso.enabledKey, v)}
          disabled={!canEdit}
          label={activo ? 'Activo' : 'Apagado'}
          className="shrink-0"
        />
      </div>

      {activo && (
        <div className="mt-4 grid gap-4 border-t border-line pt-4 sm:grid-cols-2">
          <div className={aviso.diasKey ? '' : 'sm:col-span-2'}>
            <Input
              label="Notificar a estos correos"
              value={form[aviso.emailKey] || ''}
              onChange={(e) => set(aviso.emailKey, e.target.value)}
              disabled={!canEdit}
              maxLength={400}
              noUppercase
              placeholder="bodega@empresa.com, gerencia@empresa.com"
            />
            <p className="mt-1 text-[11px] text-muted">
              Varios correos separados por coma.
            </p>
          </div>
          {aviso.diasKey && (
            <div>
              <Input
                label={aviso.diasLabel}
                type="number"
                min="1"
                max="180"
                value={form[aviso.diasKey] ?? ''}
                onChange={(e) => set(aviso.diasKey, e.target.value)}
                disabled={!canEdit}
              />
              {aviso.diasHint && <p className="mt-1 text-[11px] text-muted">{aviso.diasHint}</p>}
            </div>
          )}
          <p className="text-[11px] text-muted sm:col-span-2">{aviso.frecuencia}</p>
          {sinDestinatario && (
            <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-[11px] text-content sm:col-span-2">
              Este aviso está activo pero no tiene a quién notificar, así que no se va a enviar nada.
              Escribe al menos un correo.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function NotificationsPage() {
  const { settings, loading, saveSettings } = useSettings();
  const { hasPermission } = useAuth();
  const canEdit = hasPermission('settings.update');

  const [form, setForm] = useState(settings);
  const [saving, setSaving] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [testing, setTesting] = useState(false);
  const [revisando, setRevisando] = useState(false);
  const [historial, setHistorial] = useState([]);

  useEffect(() => setForm(settings), [settings]);

  // El historial es informativo: si falla (por ejemplo, falta la migración 039)
  // la pantalla igual sirve para configurar, así que el error no se muestra.
  useEffect(() => {
    notificationsApi.log(15).then(setHistorial).catch(() => setHistorial([]));
  }, []);

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const changed = useMemo(
    () => Object.keys(settings).filter((k) => String(form[k] ?? '') !== String(settings[k] ?? '')),
    [form, settings],
  );

  const handleSave = async () => {
    if (!changed.length) return;
    setSaving(true);
    try {
      await saveSettings(Object.fromEntries(changed.map((k) => [k, form[k]])));
      notify.success('Notificaciones guardadas');
    } catch (e) {
      notify.error(e.response?.data?.error || e.message || 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      await notificationsApi.test(testEmail);
      notify.success('n8n recibió el aviso de prueba');
      notificationsApi.log(15).then(setHistorial).catch(() => {});
    } catch (e) {
      notify.error(e.response?.data?.error || 'No se pudo mandar la prueba');
    } finally {
      setTesting(false);
    }
  };

  // Corre la revisión diaria en el momento. No manda nada si no hay nada
  // pendiente, así que se puede apretar sin miedo a llenar de correos a nadie.
  const handleRevisar = async () => {
    setRevisando(true);
    try {
      const { resultados } = await notificationsApi.run();
      const enviados = resultados.filter((r) => r.estado === 'enviado');
      const fallos = resultados.filter((r) => r.estado === 'fallo_envio' || r.estado === 'error');
      if (fallos.length) {
        notify.error(`No se pudo enviar: ${fallos.map((r) => r.label).join(', ')}`);
      } else if (enviados.length) {
        notify.success(enviados.map((r) => `${r.label}: ${r.count}`).join(' · '));
      } else {
        notify.info('Revisado: no hay nada pendiente de avisar');
      }
      notificationsApi.log(15).then(setHistorial).catch(() => {});
    } catch (e) {
      notify.error(e.response?.data?.error || 'No se pudo hacer la revisión');
    } finally {
      setRevisando(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-3 py-20 text-muted">
        <Spinner size={22} /> Cargando configuración...
      </div>
    );
  }

  const hayWebhook = !!String(form.n8n_webhook_url || '').trim();
  // Sin webhook no sale ningún aviso, sea diario o inmediato: todos viajan por
  // esa misma URL.
  const algunoActivo = AVISOS.some((a) => form[a.enabledKey]);
  const hayDiarios = AVISOS.some((a) => a.modo === 'diario' && form[a.enabledKey]);

  return (
    <div style={{ padding: '20px 16px', maxWidth: 860, margin: '0 auto' }}>
      <div className="mb-5 flex items-center gap-3">
        <BellRing size={24} className="text-orange-500" />
        <PageHeader
          title="Notificaciones"
          subtitle="Avisos automáticos por correo: qué se avisa y a quién"
        />
      </div>

      {!canEdit && (
        <p className="mb-4 rounded-lg border border-orange-500/40 bg-orange-500/10 px-4 py-3 text-xs text-content">
          Solo puedes consultar esta configuración. Para cambiarla necesitas el permiso
          <strong> settings.update</strong> (normalmente, el rol Administrador).
        </p>
      )}

      {/* ── CONEXION CON n8n ────────────────────────────────────────── */}
      <Section
        icon={Webhook}
        title="Conexión con n8n"
        description="El sistema no envía correos por su cuenta: decide qué avisar y n8n lo manda."
      >
        <Input
          label="URL del webhook de n8n"
          value={form.n8n_webhook_url || ''}
          onChange={(e) => set('n8n_webhook_url', e.target.value)}
          disabled={!canEdit}
          maxLength={300}
          noUppercase
          placeholder="https://n8n.miempresa.com/webhook/aeg-notificaciones"
        />
        <p className="mt-1 text-[11px] text-muted">
          <strong>Todos</strong> los avisos de esta pantalla salen por aquí: el sistema le manda a
          n8n el correo ya redactado (destinatario, asunto y contenido) y n8n lo envía. Tiene que ser
          la URL de <strong>producción</strong> del webhook — la de prueba solo funciona mientras el
          flujo está abierto y escuchando en n8n.
        </p>

        {!hayWebhook && algunoActivo && (
          <p className="mt-3 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-content">
            Tienes avisos activos pero no hay URL de webhook, así que no se va a enviar ninguno.
          </p>
        )}

        {canEdit && (
          <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-line pt-4">
            <div className="min-w-[220px] flex-1">
              <Input
                label="Probar el envío a este correo"
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                noUppercase
                placeholder="tucorreo@empresa.com"
              />
            </div>
            <Button
              variant="outline"
              onClick={handleTest}
              loading={testing}
              disabled={!hayWebhook || !testEmail.trim() || changed.includes('n8n_webhook_url')}
            >
              <Send size={15} /> Enviar prueba
            </Button>
          </div>
        )}
        {changed.includes('n8n_webhook_url') && (
          <p className="mt-2 text-[11px] text-muted">
            Guarda la URL antes de probarla — la prueba usa la que está guardada, no la que está
            escrita en pantalla.
          </p>
        )}
      </Section>

      {/* ── REVISION DIARIA ─────────────────────────────────────────── */}
      <Section
        icon={Clock}
        title="Revisión diaria"
        description="Cuándo se revisan los avisos marcados como «Diario»."
      >
        <div className="flex flex-wrap items-end gap-4">
          <div className="w-40">
            <Input
              label="Hora de la revisión"
              type="number"
              min="0"
              max="23"
              value={form.notif_daily_hour ?? ''}
              onChange={(e) => set('notif_daily_hour', e.target.value)}
              disabled={!canEdit}
            />
          </div>
          <p className="flex-1 text-[11px] text-muted">
            Hora del servidor, de 0 a 23. Una vez al día, a esa hora, el sistema revisa si hay stock
            bajo, mantenimientos por vencer o cotizaciones por caducar, y manda un correo por cada
            cosa que encuentre. Si no hay nada, no manda nada.
          </p>
        </div>

        {canEdit && (
          <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-line pt-4">
            <Button variant="outline" onClick={handleRevisar} loading={revisando} disabled={!hayWebhook || !hayDiarios}>
              <RefreshCw size={15} /> Revisar ahora
            </Button>
            <p className="flex-1 text-[11px] text-muted">
              Corre la revisión en el momento, sin esperar a la hora. Se puede apretar sin miedo:
              lo que ya se avisó no se vuelve a mandar.
            </p>
          </div>
        )}
      </Section>

      {/* ── LOS AVISOS ──────────────────────────────────────────────── */}
      <Section
        icon={BellRing}
        title="Avisos automáticos"
        description="Cada aviso se prende por separado y va a los correos que se indiquen."
      >
        <div className="grid gap-3">
          {AVISOS.map((aviso) => (
            <AvisoCard key={aviso.key} aviso={aviso} form={form} set={set} canEdit={canEdit} />
          ))}
        </div>
      </Section>

      {/* ── ENVIO MANUAL DE COTIZACIONES ────────────────────────────── */}
      <Section
        icon={Mail}
        title="Enviar cotizaciones al cliente"
        description="Esto no se configura aquí porque no es automático."
      >
        <p className="text-xs text-muted">
          En la pantalla de <strong>Cotizaciones</strong>, cada cotización tiene el botón
          <strong> "Enviar por correo"</strong>. Al usarlo el sistema pide a qué dirección mandarla —
          viene propuesta la del cliente, pero se puede cambiar, porque muchas veces la cotización la
          recibe alguien de compras y no el contacto que quedó guardado en la ficha. El correo sale
          con el PDF adjunto, por el mismo webhook de n8n de arriba.
        </p>
      </Section>

      {/* ── HISTORIAL ───────────────────────────────────────────────── */}
      {historial.length > 0 && (
        <Section
          icon={History}
          title="Últimos avisos enviados"
          description="Sirve para confirmar que algo se mandó, y cuándo."
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-line text-muted">
                  <th className="py-2 pr-4 font-semibold">Aviso</th>
                  <th className="py-2 pr-4 font-semibold">Referencia</th>
                  <th className="py-2 pr-4 font-semibold">Canal</th>
                  <th className="py-2 font-semibold">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {historial.map((h) => (
                  <tr key={h.id} className="border-b border-line/60">
                    <td className="py-2 pr-4 text-content">{TIPOS[h.type] || h.type}</td>
                    <td className="py-2 pr-4 text-muted">
                      {REFERENCIAS[h.reference_type] || h.reference_type} #{h.reference_id}
                    </td>
                    <td className="py-2 pr-4 text-muted">{CANALES[h.channel] || h.channel}</td>
                    <td className="py-2 text-muted">
                      {new Date(h.sent_at).toLocaleString('es-GT', {
                        day: '2-digit', month: '2-digit', year: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      {/* ── GUARDAR ─────────────────────────────────────────────────── */}
      {canEdit && (
        <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center justify-end gap-3 border-t border-line bg-app/95 px-4 py-3 backdrop-blur">
          <span className="mr-auto text-xs text-muted">
            {changed.length
              ? `${changed.length} cambio${changed.length > 1 ? 's' : ''} sin guardar`
              : 'Todo guardado'}
          </span>
          <Button variant="outline" onClick={() => setForm(settings)} disabled={!changed.length || saving}>
            Descartar
          </Button>
          <Button variant="primary" onClick={handleSave} disabled={!changed.length} loading={saving}>
            <Save size={16} /> Guardar cambios
          </Button>
        </div>
      )}
    </div>
  );
}
