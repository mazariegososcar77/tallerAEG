/** Area de texto con label y error opcional (mismo estilo que Input). */
export default function Textarea({ label, error, id, className = '', rows = 3, ...props }) {
  const fieldId = id || props.name;
  return (
    <div className={className}>
      {label && (
        <label htmlFor={fieldId} className="mb-1 block text-sm font-medium text-navy-800">
          {label}
        </label>
      )}
      <textarea
        id={fieldId}
        rows={rows}
        className={`w-full resize-y rounded-md border bg-white px-3 py-2 text-sm text-navy-900
          placeholder:text-slate-400 focus-brand
          ${error ? 'border-red-400' : 'border-slate-300'}`}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
