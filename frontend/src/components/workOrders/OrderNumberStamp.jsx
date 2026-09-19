// El NÚMERO de la orden, editable y con aspecto de sello: recuadro blanco con doble borde y
// tinta negra, como el número estampado en el talonario físico. Se puede escribir a mano
// porque, mientras el taller trabaja en paralelo con el papel, el técnico copia aquí el número
// de la orden física. Al crear una orden, si se deja vacío el sistema asigna el siguiente.
//
// Es blanco con negro a propósito, tanto en tema claro como oscuro (un sello es tinta sobre
// papel). El borde tiene un leve filtro de ruido para que no se vea tan digital; el texto queda
// fuera del filtro para que se lea nítido.
import { useState } from 'react';

const INK = '#141414';

export default function OrderNumberStamp({ value, onChange, disabled = false }) {
  const [focused, setFocused] = useState(false);
  const text = String(value ?? '');
  const chars = Math.min(20, Math.max(5, text.length + 1));

  return (
    <label
      title="Número de la orden. Escribe el de la orden física; si lo dejas vacío al crear, el sistema asigna el siguiente."
      style={{
        position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 8,
        padding: '5px 14px', background: '#fff', borderRadius: 3, cursor: disabled ? 'default' : 'text',
        transform: 'rotate(-1.2deg)',
        boxShadow: focused ? '0 0 0 3px rgba(202,138,4,.45)' : '0 1px 2px rgba(0,0,0,.18)',
      }}
    >
      {/* Ruido para el borde entintado (definicion del filtro, sin tamaño propio). */}
      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true" focusable="false">
        <filter id="stamp-rough" x="-5%" y="-10%" width="110%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="4" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="1.8" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </svg>
      {/* Doble borde de sello */}
      <span
        aria-hidden="true"
        style={{
          position: 'absolute', inset: 0, borderRadius: 3, border: `2px solid ${INK}`, pointerEvents: 'none',
          boxShadow: `inset 0 0 0 2px #fff, inset 0 0 0 3px ${INK}`, filter: 'url(#stamp-rough)',
        }}
      />
      <span style={{ fontFamily: 'Georgia, "Times New Roman", serif', fontWeight: 800, fontSize: 14, color: INK, position: 'relative' }}>Nº</span>
      <input
        value={text}
        onChange={(e) => onChange(e.target.value)}
        onFocus={(e) => { setFocused(true); e.target.select(); }}
        onBlur={() => setFocused(false)}
        maxLength={20}
        disabled={disabled}
        placeholder="Auto"
        aria-label="Número de la orden"
        style={{
          position: 'relative', width: `${chars}ch`, minWidth: 0, background: 'transparent', border: 'none', outline: 'none',
          padding: 0, color: INK, caretColor: INK, fontFamily: '"Courier New", ui-monospace, monospace',
          fontWeight: 800, fontSize: 18, letterSpacing: '1px', textTransform: 'uppercase',
        }}
      />
    </label>
  );
}
