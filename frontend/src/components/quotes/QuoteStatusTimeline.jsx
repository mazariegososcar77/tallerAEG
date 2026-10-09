// Línea de tiempo de estados de una cotización, EN FORMA DE CUADRITOS CLICABLES: el estado
// se cambia desde aquí mismo, en la tarjeta de la lista, sin entrar a la cotización y sin
// el selector libre que había antes. Reemplaza el viejo selector de "Estado" del formulario
// (ver QuoteFormPage.jsx) por un flujo de un solo sentido:
//
//   Borrador --(clic)--> Enviada --(clic: Aprobar o Rechazar)--> Aprobada / Rechazada
//
// Una vez que se avanza, el cuadrito anterior queda NEGRO con un candado: ya no se puede
// tocar. "Vencida" no es un cuadrito que se haga clic — el sistema la pone sola cuando se
// pasa la fecha de "Válida hasta" sin que nadie haya aprobado ni rechazado (ver
// quoteService.expireOverdue en el backend); aquí solo se muestra, también bloqueada.
//
// El único que puede deshacer todo esto es quien tenga el permiso `quotes.reset-status`
// (Administrador por defecto): el botón "Reiniciar a Borrador" al final de la fila.
import { useState } from 'react';
import { Check, X, Clock, Lock, RotateCcw } from 'lucide-react';
import { quotesApi } from '../../api/quotesApi.js';
import { notify } from '../../lib/toast.js';
import { useAuth } from '../../hooks/useAuth.js';
import ConfirmDialog from '../ui/ConfirmDialog.jsx';

const HAPPY_PATH = ['borrador', 'enviada', 'aprobada'];
const LABELS = { borrador: 'Borrador', enviada: 'Enviada', aprobada: 'Aprobada', rechazada: 'Rechazada', vencida: 'Vencida' };
const CURRENT_COLOR = '#CA8A04'; // mismo acento que "No. {numero}" y los botones primarios
const SUCCESS_COLOR = '#10b981';
const PENDING_COLOR = '#cbd5e1';
const PASSED_COLOR = '#334155'; // "negro" pedido: en realidad un gris carbon, mas legible que #000 puro
const ALT_COLOR = { rechazada: '#ef4444', vencida: '#f59e0b' };
const ALT_ICON = { rechazada: X, vencida: Clock };

// Mensaje de confirmacion segun hacia donde se esta por mandar la cotizacion -- cada clic
// es un cambio real (API), nunca se aplica sin que la persona confirme que si quiso.
const CONFIRM_TEXT = {
  enviada: 'Se marcará como Enviada. El paso "Borrador" quedará bloqueado: ya no podrás regresarla tú mismo.',
  aprobada: 'Se marcará como Aprobada. Ya no se podrá cambiar su estado desde aquí (solo un administrador podría reiniciarla a Borrador).',
  rechazada: 'Se marcará como Rechazada. Ya no se podrá cambiar su estado desde aquí (solo un administrador podría reiniciarla a Borrador).',
  borrador: 'Se reiniciará a Borrador: se pierde el avance actual (Enviada/Aprobada/Rechazada/Vencida) y vuelve a quedar como recién creada.',
};

// Un cuadrito ("chequesito") de la linea de tiempo. `role` decide como se ve y si reacciona
// al mouse -- el color y el icono salen de ahi, no se repiten en cada llamada.
const ROLE_STYLE = {
  passed:  { bg: PASSED_COLOR, border: PASSED_COLOR, icon: Lock, iconColor: '#fff', textColor: PASSED_COLOR, clickable: false },
  current: { bg: CURRENT_COLOR, border: CURRENT_COLOR, icon: null, iconColor: '#fff', textColor: CURRENT_COLOR, clickable: false },
  next:    { bg: 'transparent', border: CURRENT_COLOR, icon: null, iconColor: CURRENT_COLOR, textColor: CURRENT_COLOR, clickable: true },
  future:  { bg: 'transparent', border: PENDING_COLOR, icon: null, iconColor: PENDING_COLOR, textColor: '#94a3b8', clickable: false },
  success: { bg: SUCCESS_COLOR, border: SUCCESS_COLOR, icon: Check, iconColor: '#fff', textColor: SUCCESS_COLOR, clickable: false },
};

function Square({ role, label, onClick, title }) {
  const s = ROLE_STYLE[role];
  const Icon = s.icon;
  return (
    <button
      type="button"
      disabled={!s.clickable}
      onClick={s.clickable ? onClick : undefined}
      title={title}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 5, border: 'none', background: 'none', padding: 0,
        cursor: s.clickable ? 'pointer' : 'default', font: 'inherit',
      }}
    >
      <span
        style={{
          width: 16, height: 16, borderRadius: 4, flexShrink: 0,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          background: s.bg, border: '1.5px solid ' + s.border,
        }}
      >
        {Icon && <Icon size={10} strokeWidth={3} color={s.iconColor} />}
      </span>
      <span style={{ fontSize: 11, fontWeight: role === 'future' ? 500 : 700, color: s.textColor }}>{label}</span>
    </button>
  );
}

export default function QuoteStatusTimeline({ quoteId, status, onChanged }) {
  const { hasPermission } = useAuth();
  const [pendingTarget, setPendingTarget] = useState(null); // estado al que se quiere pasar, mientras se confirma

  const canReset = hasPermission('quotes.reset-status');
  const isAlt = status === 'rechazada' || status === 'vencida';
  const currentIndex = isAlt ? 2 : Math.max(0, HAPPY_PATH.indexOf(status));
  // El unico cuadrito clicable "hacia adelante" es el inmediato siguiente -- no se puede
  // saltar de Borrador a Aprobada de un clic. Si ya se llego a un desenlace (Aprobada,
  // o el alterno Rechazada/Vencida), no hay siguiente.
  const nextIndex = !isAlt && currentIndex < HAPPY_PATH.length - 1 ? currentIndex + 1 : -1;

  const requestChange = (target) => setPendingTarget(target);
  const closeConfirm = () => setPendingTarget(null);
  const applyChange = async () => {
    try {
      await quotesApi.updateStatus(quoteId, pendingTarget);
      notify.success(
        pendingTarget === 'borrador' ? 'Cotización reiniciada a Borrador' : `Cotización marcada como ${LABELS[pendingTarget]}`,
      );
      setPendingTarget(null);
      onChanged?.();
    } catch (e) {
      notify.error(e.response?.data?.error || e.message || 'No se pudo cambiar el estado');
      // No se cierra el dialogo: que la persona vea el aviso y decida si reintenta o cancela.
    }
  };

  const steps = HAPPY_PATH.map((key, i) => {
    if (isAlt && i === 2) {
      return { key: status, label: LABELS[status], role: 'alt' };
    }
    if (i < currentIndex) return { key, label: LABELS[key], role: 'passed' };
    if (i === currentIndex) return { key, label: LABELS[key], role: key === 'aprobada' ? 'success' : 'current' };
    if (i === nextIndex) return { key, label: LABELS[key], role: 'next' };
    return { key, label: LABELS[key], role: 'future' };
  });

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', margin: '3px 0 6px' }}>
        {steps.map((s) =>
          s.role === 'alt' ? (
            <span key={s.key} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 16, height: 16, borderRadius: 4, flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: ALT_COLOR[status], border: '1.5px solid ' + ALT_COLOR[status] }}>
                {(() => { const Icon = ALT_ICON[status]; return <Icon size={10} strokeWidth={3} color="#fff" />; })()}
              </span>
              <span style={{ fontSize: 11, fontWeight: 700, color: ALT_COLOR[status] }}>{s.label}</span>
            </span>
          ) : (
            <Square
              key={s.key}
              role={s.role}
              label={s.label}
              title={s.role === 'next' ? `Marcar como ${s.label}` : undefined}
              onClick={() => requestChange(s.key)}
            />
          ),
        )}

        {/* Rechazar: solo mientras esta "Enviada" (el otro desenlace posible, junto a Aprobar
            arriba). No es "el siguiente cuadrito", por eso va aparte, no dentro de la fila de pasos. */}
        {status === 'enviada' && (
          <button
            type="button"
            onClick={() => requestChange('rechazada')}
            title="Rechazar esta cotización"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, border: '1.5px solid #ef4444', background: 'transparent', borderRadius: 4, padding: '1px 6px 1px 2px', cursor: 'pointer' }}
          >
            <X size={11} strokeWidth={3} color="#ef4444" />
            <span style={{ fontSize: 11, fontWeight: 700, color: '#ef4444' }}>Rechazar</span>
          </button>
        )}

        {/* "Reiniciar a Borrador": el escape para deshacer todo, solo para quien tenga el
            permiso quotes.reset-status (Administrador por defecto). */}
        {canReset && status !== 'borrador' && (
          <button
            type="button"
            onClick={() => requestChange('borrador')}
            title="Reiniciar esta cotización a Borrador (requiere permiso de administrador)"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, border: 'none', background: 'none', padding: 0, cursor: 'pointer', color: '#94a3b8' }}
          >
            <RotateCcw size={12} />
            <span style={{ fontSize: 11, fontWeight: 600 }}>Reiniciar</span>
          </button>
        )}
      </div>

      <ConfirmDialog
        open={pendingTarget != null}
        onClose={closeConfirm}
        onConfirm={applyChange}
        title={pendingTarget === 'borrador' ? 'Reiniciar a Borrador' : `Marcar como ${LABELS[pendingTarget] || ''}`}
        message={pendingTarget ? CONFIRM_TEXT[pendingTarget] : ''}
        confirmText={pendingTarget === 'rechazada' ? 'Rechazar' : 'Confirmar'}
        variant={pendingTarget === 'rechazada' || pendingTarget === 'borrador' ? 'danger' : 'primary'}
      />
    </>
  );
}
