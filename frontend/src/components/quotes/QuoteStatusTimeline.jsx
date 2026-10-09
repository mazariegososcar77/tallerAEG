// Mini "línea de tiempo" de los 3 pasos normales de una cotización (Borrador → Enviada →
// Aprobada), en forma de chips con check — se ve en la tarjeta de la lista, sin tener que
// entrar a editar. Si la cotización se rechazó o venció, el tercer paso cambia de ícono y
// color para mostrar ese desenlace en vez de "Aprobada".
//
// Simplificación a propósito: el sistema no guarda el historial de cambios de estado, solo
// el estado actual. Cuando el desenlace es Rechazada/Vencida, los pasos "Borrador" y
// "Enviada" se pintan como ya cumplidos (es el flujo normal) aunque no haya forma de
// confirmarlo — si alguien rechazó una cotización que nunca se llegó a enviar, este
// resumen no lo distingue.
import { Check, X, Clock } from 'lucide-react';

const HAPPY_PATH = ['borrador', 'enviada', 'aprobada'];
const LABELS = { borrador: 'Borrador', enviada: 'Enviada', aprobada: 'Aprobada', rechazada: 'Rechazada', vencida: 'Vencida' };
const CURRENT_COLOR = '#CA8A04'; // mismo acento que "No. {numero}" y los botones primarios
const DONE_COLOR = '#10b981';
const PENDING_COLOR = '#cbd5e1';
const ALT_COLOR = { rechazada: '#ef4444', vencida: '#f59e0b' };
const ALT_ICON = { rechazada: X, vencida: Clock };

// El circulo de cada paso: relleno + icono blanco cuando ya se cumplio (o es el desenlace
// final), solo el borde cuando todavia no llega.
function Dot({ color, filled, Icon }) {
  return (
    <span
      style={{
        width: 15, height: 15, borderRadius: '50%', flexShrink: 0,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        background: filled ? color : 'transparent',
        border: '1.5px solid ' + (filled ? color : PENDING_COLOR),
      }}
    >
      {Icon && <Icon size={9} strokeWidth={3} color="#fff" />}
    </span>
  );
}

export default function QuoteStatusTimeline({ status }) {
  const isAlt = status === 'rechazada' || status === 'vencida';
  const currentIndex = isAlt ? 2 : Math.max(0, HAPPY_PATH.indexOf(status));

  const steps = HAPPY_PATH.map((key, i) => {
    if (isAlt && i === 2) {
      return { key: status, label: LABELS[status], color: ALT_COLOR[status], Icon: ALT_ICON[status], filled: true, bold: true };
    }
    if (i < currentIndex) {
      return { key, label: LABELS[key], color: DONE_COLOR, Icon: Check, filled: true, bold: false };
    }
    if (i === currentIndex) {
      // "Aprobada" como paso actual ya es un desenlace (no un paso a medias): se ve como
      // los pasos cumplidos, con check verde, en vez del punto naranja de "en curso".
      if (key === 'aprobada') return { key, label: LABELS[key], color: DONE_COLOR, Icon: Check, filled: true, bold: true };
      return { key, label: LABELS[key], color: CURRENT_COLOR, Icon: null, filled: true, bold: true };
    }
    return { key, label: LABELS[key], color: PENDING_COLOR, Icon: null, filled: false, bold: false };
  });

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', margin: '3px 0 6px' }}>
      {steps.map((s) => (
        <span key={s.key} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          <Dot color={s.color} filled={s.filled} Icon={s.Icon} />
          <span style={{ fontSize: 11, fontWeight: s.bold ? 700 : 500, color: s.filled ? s.color : '#94a3b8' }}>
            {s.label}
          </span>
        </span>
      ))}
    </div>
  );
}
