/**
 * Es un simple circulito pintado de un color. Se usa, por ejemplo, para
 * mostrar de un vistazo el color asignado a una bodega en la lista de
 * Configuración, sin tener que leer el texto.
 */
export default function ColorDot({ color, className = 'h-3 w-3' }) {
  return (
    <span
      className={`inline-block shrink-0 rounded-full border border-slate-200 ${className}`}
      style={{ backgroundColor: color || '#94a3b8' }}
    />
  );
}
