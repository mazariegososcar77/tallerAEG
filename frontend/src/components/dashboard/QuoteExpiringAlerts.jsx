// Alerta del Dashboard: cotizaciones que vencen pronto (dentro de los dias configurados en
// Configuracion > Notificaciones > "Cotizaciones por vencer") y que siguen "Enviada" -- sin
// que el cliente haya dicho ni que si ni que no todavia. Dos acciones rapidas por fila:
// Cancelarla (la marca "Rechazada") o avisarle al cliente por correo que se esta por vencer
// (reusa el mismo modal de "Enviar por correo" de Cotizaciones, con el PDF adjunto).
//
// Si no hay ninguna por vencer, el componente no dibuja nada (no hay por que ocupar espacio
// en el Dashboard con un "todo en orden"). Una vez que una cotizacion se pasa de fecha sin
// que nadie haga nada, el sistema la marca "Vencida" solo (ver quoteService.expireOverdue)
// y sale de esta lista -- aqui solo viven las que TODAVIA se pueden salvar.
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Ban, Mail } from 'lucide-react';
import { quotesApi } from '../../api/quotesApi.js';
import { notify } from '../../lib/toast.js';
import ConfirmDialog from '../ui/ConfirmDialog.jsx';
import SendQuoteEmailModal from '../quotes/SendQuoteEmailModal.jsx';

const C = { card: 'var(--c-surface)', border: 'var(--c-line)', text: 'var(--c-text)', muted: 'var(--c-muted)', amber: '#f59e0b' };

// "Vence hoy" / "Vence mañana" / "Faltan N días" / "Vencida hace N días" (este ultimo caso es
// una foto transitoria: el reloj del sistema revisa el vencimiento cada ~10 minutos, asi que
// por unos minutos una recien vencida puede seguir apareciendo aqui con dias negativos).
function daysLeftLabel(days) {
  const n = Number(days);
  if (n === 0) return { text: 'Vence hoy', color: '#ef4444' };
  if (n === 1) return { text: 'Vence mañana', color: C.amber };
  if (n > 1) return { text: `Faltan ${n} días`, color: C.amber };
  return { text: `Vencida hace ${Math.abs(n)} día(s)`, color: '#ef4444' };
}

export default function QuoteExpiringAlerts() {
  const navigate = useNavigate();
  const [quotes, setQuotes] = useState([]);
  const [toCancel, setToCancel] = useState(null); // fila que se va a cancelar (rechazar)
  const [emailQuote, setEmailQuote] = useState(null); // cotizacion completa, lista para el modal de correo
  const [loadingEmailId, setLoadingEmailId] = useState(null); // id mientras se trae completa para el modal

  const reload = useCallback(() => {
    quotesApi.expiringSoon().then(setQuotes).catch((e) => notify.error(e.message));
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const handleCancel = async () => {
    try {
      await quotesApi.updateStatus(toCancel.id, 'rechazada');
      notify.success(`Cotización No. ${toCancel.number} cancelada`);
      setToCancel(null);
      reload();
    } catch (e) {
      notify.error(e.response?.data?.error || e.message || 'No se pudo cancelar la cotización');
    }
  };

  // El modal de correo necesita la cotizacion completa (con sus contactos); esta lista solo
  // trae lo minimo para no cargar el Dashboard con datos de mas.
  const openEmail = async (q) => {
    setLoadingEmailId(q.id);
    try {
      setEmailQuote(await quotesApi.get(q.id));
    } catch (e) {
      notify.error(e.message || 'No se pudo abrir la cotización');
    } finally {
      setLoadingEmailId(null);
    }
  };

  if (quotes.length === 0) return null;

  return (
    <div style={{ background: C.card, border: '1px solid ' + C.amber + '55', borderRadius: 12, padding: '14px 16px', marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <AlertTriangle size={16} color={C.amber} />
        <span style={{ fontSize: 13, fontWeight: 800, color: C.text }}>Cotizaciones por vencer</span>
        <span style={{ fontSize: 12, color: C.muted }}>({quotes.length})</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {quotes.map((q) => {
          const d = daysLeftLabel(q.days_left);
          return (
            <div key={q.id} style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 10, padding: '8px 10px', background: 'var(--c-surface-2)', borderRadius: 8 }}>
              <div style={{ flex: 1, minWidth: 180 }}>
                <span onClick={() => navigate('/cotizaciones/' + q.id + '/editar')} style={{ fontSize: 13, fontWeight: 700, color: '#CA8A04', cursor: 'pointer' }}>No. {q.number}</span>
                <span style={{ fontSize: 13, color: C.text, marginLeft: 8 }}>{q.client_name || '—'}</span>
                <p style={{ margin: '2px 0 0', fontSize: 11, color: d.color, fontWeight: 700 }}>{d.text} · {q.valid_until?.slice(0, 10)}</p>
              </div>
              {q.total > 0 && <span style={{ fontSize: 13, fontWeight: 700, color: '#10b981' }}>Q {Number(q.total).toFixed(2)}</span>}
              <button onClick={() => openEmail(q)} disabled={loadingEmailId === q.id} title="Avisarle al cliente por correo que está por vencer" style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'var(--c-surface)', border: '1px solid ' + C.border, borderRadius: 7, padding: '6px 10px', cursor: loadingEmailId === q.id ? 'default' : 'pointer', color: '#CA8A04', fontSize: 11, fontWeight: 700, opacity: loadingEmailId === q.id ? 0.6 : 1 }}>
                <Mail size={13} /> Enviar correo
              </button>
              <button onClick={() => setToCancel(q)} title="Cancelar esta cotización" style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#ef444415', border: '1px solid #ef444440', borderRadius: 7, padding: '6px 10px', cursor: 'pointer', color: '#ef4444', fontSize: 11, fontWeight: 700 }}>
                <Ban size={13} /> Cancelar
              </button>
            </div>
          );
        })}
      </div>

      <ConfirmDialog
        open={toCancel != null}
        onClose={() => setToCancel(null)}
        onConfirm={handleCancel}
        title="Cancelar cotización"
        message={toCancel ? `Se cancelará la cotización No. ${toCancel.number} de ${toCancel.client_name || 'este cliente'} (queda marcada como Rechazada). Esta acción no se puede deshacer desde aquí.` : ''}
        confirmText="Cancelar cotización"
      />

      <SendQuoteEmailModal
        quote={emailQuote}
        onClose={() => setEmailQuote(null)}
        onSent={reload}
      />
    </div>
  );
}
