export default function Textarea({ label, error, id, className = '', rows = 3, ...props }) {
  const fieldId = id || props.name;
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
        className={`w-full resize-y rounded-md border bg-surface2 px-3 py-2 text-sm text-content
          placeholder:text-slate-500 focus-brand
          ${error ? 'border-red-400' : 'border-line'}`}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
}
