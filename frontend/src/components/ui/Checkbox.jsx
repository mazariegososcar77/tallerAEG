import { Check } from 'lucide-react';

/**
 * Checkbox propio (reemplaza el <input type="checkbox"> nativo) con el estilo de la app.
 * Controlado: `checked` + `onChange(nextChecked)`. Toda la fila es clicable.
 */
export default function Checkbox({ checked, onChange, label, disabled = false, className = '' }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange?.(!checked)}
      className={`group flex items-center gap-2 text-left text-sm text-slate-300
        disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
    >
      <span
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors
          group-focus-visible:ring-2 group-focus-visible:ring-orange-400
          ${
            checked
              ? 'border-orange-500 bg-orange-500 text-white'
              : 'border-slate-300 bg-white group-hover:border-orange-400'
          }`}
      >
        {checked && <Check size={14} strokeWidth={3} />}
      </span>
      {label && <span>{label}</span>}
    </button>
  );
}
