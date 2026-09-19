import { useState } from 'react';
import { formatCurrency, parseCurrencyInput } from '../../lib/currency.js';

/**
 * Campo de precio con el formato de moneda del sistema ("Q.500.00", punto
 * como separador, siempre 2 decimales). Mientras se esta escribiendo muestra
 * el numero tal cual lo tecleo el usuario (para no pelear con el cursor); al
 * salir del campo lo reformatea. Es un reemplazo directo de un
 * `<input type="number">`: `onChange` recibe un evento con `target.value` en
 * texto plano (sin "Q." ni separadores), igual que un input nativo.
 */
export default function CurrencyInput({ value, onChange, onBlur, style, disabled, readOnly, ...rest }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  // value === '' (o null/undefined) es "todavia no se capturo" -- se respeta tal
  // cual, sin forzarlo a 0, para no pisar campos donde eso significa algo
  // distinto de un precio real de Q0.00 (ej. precio de compra sin capturar).
  const isEmpty = value === '' || value === null || value === undefined;
  const display = editing ? draft : (isEmpty ? '' : formatCurrency(value));

  const handleFocus = (e) => {
    if (readOnly) return;
    const num = Number(value) || 0;
    setDraft(isEmpty || num === 0 ? '' : String(num));
    setEditing(true);
    e.target.select?.();
  };
  const handleBlur = (e) => { setEditing(false); onBlur?.(e); };
  const handleChange = (e) => {
    const raw = e.target.value;
    if (!/^[0-9]*\.?[0-9]*$/.test(raw)) return; // solo digitos y un punto decimal
    setDraft(raw);
    onChange?.({ target: { value: raw === '' ? '' : String(parseCurrencyInput(raw)) } });
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      value={display}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onChange={handleChange}
      disabled={disabled}
      readOnly={readOnly}
      style={style}
      {...rest}
    />
  );
}
