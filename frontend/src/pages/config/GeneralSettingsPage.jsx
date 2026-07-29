// ============================================================================
// PANTALLA: Configuración → Configuración General (/configuracion/general)
// Ajustes que aplican a TODO el sistema (no a un usuario en particular). Se
// guardan en la base de datos (tabla system_settings) y los ve todo el mundo:
//   - Apariencia: tema por defecto (claro/oscuro/seguir el dispositivo) y los
//     dos colores de marca. Los colores se aplican al instante al guardar, sin
//     recargar la página.
//   - Datos del taller: nombre, dirección, teléfono, NIT y correo. Es lo que se
//     imprime en el encabezado y el pie de TODOS los PDF del sistema.
//   - Documentos: días de vigencia por defecto de una cotización nueva.
// Solo puede guardar quien tenga el permiso `settings.update` (por defecto, el
// rol Administrador); los demás ven los valores pero no los pueden cambiar.
// ============================================================================
import { useEffect, useMemo, useRef, useState } from 'react';
import { SlidersHorizontal, Save, RotateCcw, Palette, Building2, FileText, Sun, Moon, MonitorSmartphone } from 'lucide-react';
import { useSettings } from '../../hooks/useSettings.js';
import { useAuth } from '../../hooks/useAuth.js';
import { useTheme } from '../../hooks/useTheme.js';
import { notify } from '../../lib/toast.js';
import { BRAND_PRIMARY, BRAND_ACCENT, isLight } from '../../lib/palette.js';
import PageHeader from '../../components/common/PageHeader.jsx';
import ColorPicker from '../../components/ui/ColorPicker.jsx';
import Input from '../../components/ui/Input.jsx';
import Button from '../../components/ui/Button.jsx';
import Spinner from '../../components/ui/Spinner.jsx';

const THEME_OPTIONS = [
  { value: 'light',  label: 'Claro',                icon: Sun,               hint: 'Fondo verde claro' },
  { value: 'dark',   label: 'Oscuro',               icon: Moon,              hint: 'Fondo verde oscuro' },
  { value: 'system', label: 'Seguir el dispositivo', icon: MonitorSmartphone, hint: 'Segun el celular/PC' },
];

// Tarjeta de una sección de ajustes.
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

export default function GeneralSettingsPage() {
  const { settings, loading, saveSettings, previewColors } = useSettings();
  const { hasPermission } = useAuth();
  const { theme, hasUserChoice, resetToSystemDefault } = useTheme();
  const canEdit = hasPermission('settings.update');

  const [form, setForm] = useState(settings);
  const [saving, setSaving] = useState(false);
  // Se usa para devolver los colores reales al salir de la pantalla si el
  // usuario estuvo probando colores y no guardó.
  const savedColors = useRef({ primary: settings.color_primary, accent: settings.color_accent });

  // Cuando termina de cargar la configuración del servidor, llena el formulario.
  useEffect(() => {
    setForm(settings);
    savedColors.current = { primary: settings.color_primary, accent: settings.color_accent };
  }, [settings]);

  // Al salir de la pantalla: si quedaron colores "de prueba" sin guardar, se
  // vuelve a los guardados para no dejar la app de otro color.
  useEffect(() => () => previewColors(savedColors.current), [previewColors]);

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  // Cambiar un color se ve de inmediato en toda la pantalla (aún sin guardar),
  // así se puede juzgar cómo queda antes de aplicarlo para todos.
  const setColor = (key, value) => {
    const next = { ...form, [key]: value };
    setForm(next);
    previewColors({ primary: next.color_primary, accent: next.color_accent });
  };

  // Qué campos cambiaron respecto a lo guardado (para habilitar "Guardar" y
  // mandar solo lo necesario).
  const changed = useMemo(
    () => Object.keys(settings).filter((k) => String(form[k] ?? '') !== String(settings[k] ?? '')),
    [form, settings],
  );

  const handleSave = async () => {
    if (!changed.length) return;
    setSaving(true);
    try {
      const payload = Object.fromEntries(changed.map((k) => [k, form[k]]));
      await saveSettings(payload);
      notify.success('Configuración guardada');
    } catch (e) {
      notify.error(e.response?.data?.error || e.message || 'No se pudo guardar la configuración');
      // Si falló, deja en pantalla los colores que sí están guardados.
      previewColors(savedColors.current);
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    setForm(settings);
    previewColors(savedColors.current);
  };

  const restoreBrandColors = () => {
    const next = { ...form, color_primary: BRAND_PRIMARY, color_accent: BRAND_ACCENT };
    setForm(next);
    previewColors({ primary: BRAND_PRIMARY, accent: BRAND_ACCENT });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-3 py-20 text-muted">
        <Spinner size={22} /> Cargando configuración...
      </div>
    );
  }

  return (
    <div style={{ padding: '20px 16px', maxWidth: 860, margin: '0 auto' }}>
      <div className="mb-5 flex items-center gap-3">
        <SlidersHorizontal size={24} className="text-orange-500" />
        <PageHeader
          title="Configuración general"
          subtitle="Ajustes que aplican a todo el sistema y a todos los usuarios"
        />
      </div>

      {!canEdit && (
        <p className="mb-4 rounded-lg border border-orange-500/40 bg-orange-500/10 px-4 py-3 text-xs text-content">
          Solo puedes consultar esta configuración. Para cambiarla necesitas el permiso
          <strong> settings.update</strong> (normalmente, el rol Administrador).
        </p>
      )}

      {/* ── APARIENCIA ─────────────────────────────────────────────── */}
      <Section
        icon={Palette}
        title="Apariencia"
        description="Tema por defecto y colores de marca del sistema."
      >
        <p className="mb-2 text-sm font-medium text-muted">Tema por defecto</p>
        <div className="mb-2 grid gap-2 sm:grid-cols-3">
          {THEME_OPTIONS.map((opt) => {
            const active = form.theme_default === opt.value;
            const Icon = opt.icon;
            return (
              <button
                key={opt.value}
                type="button"
                disabled={!canEdit}
                onClick={() => set('theme_default', opt.value)}
                className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors
                  disabled:cursor-not-allowed disabled:opacity-60
                  ${active
                    ? 'border-orange-500 bg-orange-500/10 text-content'
                    : 'border-line bg-surface2 text-muted hover:border-orange-400'}`}
              >
                <Icon size={18} className={active ? 'text-orange-500' : ''} />
                <span>
                  <span className="block text-sm font-semibold text-content">{opt.label}</span>
                  <span className="block text-[11px] text-muted">{opt.hint}</span>
                </span>
              </button>
            );
          })}
        </div>
        <p className="mb-5 text-xs text-muted">
          Es el tema que ve alguien que nunca cambió el suyo. Cada usuario puede elegir otro con el
          botón de sol/luna del encabezado, y su elección manda sobre este ajuste.
          {hasUserChoice && (
            <>
              {' '}Ahora mismo tú tienes elegido el tema <strong>{theme === 'dark' ? 'oscuro' : 'claro'}</strong> a mano.{' '}
              <button type="button" onClick={resetToSystemDefault} className="font-semibold text-orange-500 underline">
                Usar el tema por defecto del sistema
              </button>
            </>
          )}
        </p>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <ColorPicker
              label="Color principal (verde de marca)"
              value={form.color_primary}
              onChange={(v) => canEdit && setColor('color_primary', v)}
            />
            <p className="mt-1 text-[11px] text-muted">Menú lateral, encabezados y botones oscuros.</p>
          </div>
          <div>
            <ColorPicker
              label="Color de acento (amarillo de marca)"
              value={form.color_accent}
              onChange={(v) => canEdit && setColor('color_accent', v)}
            />
            <p className="mt-1 text-[11px] text-muted">Botones principales, enlaces y distintivos.</p>
          </div>
        </div>

        {/* Vista previa: los mismos colores ya aplicados en la pantalla */}
        <div className="mt-5 rounded-lg border border-line bg-surface2 p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">Vista previa</p>
          <div className="flex flex-wrap items-center gap-3">
            <span
              className="rounded-md px-4 py-2 text-sm font-semibold"
              style={{ background: form.color_primary, color: isLight(form.color_primary) ? '#111827' : '#fff' }}
            >
              Color principal
            </span>
            <span
              className="rounded-md px-4 py-2 text-sm font-semibold"
              style={{ background: form.color_accent, color: isLight(form.color_accent) ? '#111827' : '#fff' }}
            >
              Color de acento
            </span>
            <span className="rounded-full border border-orange-500/40 bg-orange-500/10 px-3 py-1 text-xs font-semibold text-orange-500">
              Distintivo
            </span>
            <Button variant="primary" size="sm" type="button">Boton</Button>
          </div>
          <p className="mt-3 text-[11px] text-muted">
            El cambio ya se está viendo en toda la pantalla (menú, botones, distintivos) pero todavía
            no está guardado. Dos cosas que <strong>no</strong> cambian a propósito: los colores de
            estado (azul "en proceso", ámbar "pendiente", rojo "vencido", verde "listo"), porque
            significan algo y deben verse siempre igual; y los colores de los PDF, que los dibuja el
            servidor con la paleta fija de los documentos.
          </p>
          {canEdit && (
            <button
              type="button"
              onClick={restoreBrandColors}
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-orange-500 hover:underline"
            >
              <RotateCcw size={13} /> Restaurar los colores de marca de Taller AEG
            </button>
          )}
        </div>
      </Section>

      {/* ── DATOS DEL TALLER ───────────────────────────────────────── */}
      <Section
        icon={Building2}
        title="Datos del taller"
        description="Se imprimen en el encabezado y el pie de todos los PDF (cotizaciones, órdenes, reportes y facturas)."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Nombre del taller"
            value={form.company_name}
            onChange={(e) => set('company_name', e.target.value)}
            disabled={!canEdit}
            maxLength={120}
          />
          <Input
            label="Giro / descripcion corta"
            value={form.company_tagline}
            onChange={(e) => set('company_tagline', e.target.value)}
            disabled={!canEdit}
            maxLength={160}
            noUppercase
          />
          <Input
            label="Direccion"
            value={form.company_address}
            onChange={(e) => set('company_address', e.target.value)}
            disabled={!canEdit}
            maxLength={200}
            noUppercase
          />
          <Input
            label="Telefono"
            value={form.company_phone}
            onChange={(e) => set('company_phone', e.target.value)}
            disabled={!canEdit}
            maxLength={60}
            noUppercase
          />
          <Input
            label="NIT del taller"
            value={form.company_nit}
            onChange={(e) => set('company_nit', e.target.value)}
            disabled={!canEdit}
            maxLength={40}
            placeholder="Opcional"
          />
          <Input
            label="Correo electronico"
            type="email"
            value={form.company_email}
            onChange={(e) => set('company_email', e.target.value)}
            disabled={!canEdit}
            maxLength={120}
            placeholder="Opcional"
          />
        </div>
        <p className="mt-3 text-[11px] text-muted">
          Los campos opcionales que se dejen vacíos simplemente no se imprimen en el PDF.
        </p>
      </Section>

      {/* ── DOCUMENTOS ─────────────────────────────────────────────── */}
      <Section
        icon={FileText}
        title="Documentos"
        description="Valores por defecto al crear documentos nuevos."
      >
        <div className="sm:max-w-xs">
          <Input
            label="Vigencia de una cotizacion (dias)"
            type="number"
            min="1"
            max="365"
            value={form.quote_valid_days}
            onChange={(e) => set('quote_valid_days', e.target.value)}
            disabled={!canEdit}
          />
        </div>
        <p className="mt-2 text-[11px] text-muted">
          Es la fecha de "Válida hasta" que se propone al crear una cotización nueva, y el plazo que se
          imprime en el pie de su PDF.
        </p>
      </Section>

      {/* ── GUARDAR ────────────────────────────────────────────────── */}
      {canEdit && (
        <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center justify-end gap-3 border-t border-line bg-app/95 px-4 py-3 backdrop-blur">
          <span className="mr-auto text-xs text-muted">
            {changed.length
              ? `${changed.length} cambio${changed.length > 1 ? 's' : ''} sin guardar`
              : 'Todo guardado'}
          </span>
          <Button variant="outline" onClick={handleDiscard} disabled={!changed.length || saving}>
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
