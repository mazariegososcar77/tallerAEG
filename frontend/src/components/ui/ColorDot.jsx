/** Punto de color reutilizable (p.ej. el color de una bodega). */
export default function ColorDot({ color, className = 'h-3 w-3' }) {
  return (
    <span
      className={`inline-block shrink-0 rounded-full border border-slate-200 ${className}`}
      style={{ backgroundColor: color || '#94a3b8' }}
    />
  );
}
