import { uppercaseInPlace } from '../../lib/text.js';

// Es el campo de texto de varias líneas (como una cajita más grande) usado
// para notas, descripciones u observaciones largas en los formularios.
// Igual que el campo de texto normal (Input.jsx), convierte automáticamente
// lo escrito a MAYÚSCULAS, salvo que se le indique lo contrario con
// `noUppercase`.
export default function Textarea({ label, error, id, className = '', rows = 3, noUppercase = false, onChange, ...props }) {
  const fieldId = id || props.name;

  // Mayúsculas mientras el usuario escribe (conserva la posición del cursor).
  const handleChange = (e) => {
    if (!noUppercase) uppercaseInPlace(e.target);
    onChange?.(e);
  };

  return (
    <div className={className}>
      {label && (
        <label htmlFor={fieldId} className="mb-1 block text-sm font-medium text-muted">
          {label}
        </label>
      )}
      <textarea
        id={fieldId}
        rows={rows}
        onChange={handleChange}
        className={`w-full resize-y rounded-md border bg-surface2 px-3 py-2 text-sm text-content
          placeholder:text-slate-500 focus-brand
          ${error ? 'border-red-400' : 'border-line'}`}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
}
