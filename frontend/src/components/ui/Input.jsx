import { uppercaseInPlace } from '../../lib/text.js';

// Tipos de input donde forzar mayúsculas rompería el valor (credenciales,
// datos numéricos/temporales, selectores nativos). En esos no se transforma.
const NO_UPPERCASE_TYPES = new Set([
  'password', 'email', 'number', 'tel', 'url', 'date', 'time',
  'datetime-local', 'month', 'week', 'color', 'file', 'range',
]);

export default function Input({ label, error, id, className = '', noUppercase = false, onChange, ...props }) {
  const inputId = id || props.name;
  const type = props.type || 'text';
  const shouldUppercase = !noUppercase && !NO_UPPERCASE_TYPES.has(type);

  // Convierte a mayúsculas mientras el usuario escribe, conservando el cursor.
  const handleChange = (e) => {
    if (shouldUppercase) uppercaseInPlace(e.target);
    onChange?.(e);
  };

  return (
    <div className={className}>
      {label && (
        <label htmlFor={inputId} className="mb-1 block text-sm font-medium text-muted">
          {label}
        </label>
      )}
      <input
        id={inputId}
        onChange={handleChange}
        className={`w-full rounded-md border bg-surface2 px-3 py-2 text-sm text-content
          placeholder:text-slate-500 focus-brand
          ${error ? 'border-red-400' : 'border-line'}`}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
}
