/** Campo de texto con label y mensaje de error opcional. */
export default function Input({ label, error, id, className = '', ...props }) {
  const inputId = id || props.name;
  return (
    <div className={className}>
      {label && (
        <label htmlFor={inputId} className="mb-1 block text-sm font-medium text-navy-800">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`w-full rounded-md border bg-white px-3 py-2 text-sm text-navy-900
          placeholder:text-slate-400 focus-brand
          ${error ? 'border-red-400' : 'border-slate-300'}`}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
