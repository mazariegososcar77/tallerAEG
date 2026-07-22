/**
 * Es la "ruedita" que gira para avisar que algo se está cargando o
 * procesando (por ejemplo, mientras se guarda un formulario o se trae
 * información del servidor). Aparece dentro de botones, tablas, etc.
 */
export default function Spinner({ size = 20, className = '' }) {
  return (
    <svg
      className={`animate-spin text-current ${className}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-label="Cargando"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-90"
        fill="currentColor"
        d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z"
      />
    </svg>
  );
}
