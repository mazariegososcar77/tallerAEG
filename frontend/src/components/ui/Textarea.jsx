export default function Textarea({ label, error, id, className = '', rows = 3, ...props }) {
  const fieldId = id || props.name;
  return (
    <div className={className}>
      {label && (
        <label htmlFor={fieldId} className="mb-1 block text-sm font-medium text-slate-300">
          {label}
        </label>
      )}
      <textarea
        id={fieldId}
        rows={rows}
        className={`w-full resize-y rounded-md border bg-navy-900 px-3 py-2 text-sm text-slate-100
          placeholder:text-slate-500 focus-brand
          ${error ? 'border-red-400' : 'border-navy-600'}`}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
}
