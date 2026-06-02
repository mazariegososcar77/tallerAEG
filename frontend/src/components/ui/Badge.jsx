const VARIANTS = {
  navy: 'bg-navy-100 text-navy-800',
  orange: 'bg-orange-100 text-orange-700',
  success: 'bg-green-100 text-green-700',
  danger: 'bg-red-100 text-red-700',
  gray: 'bg-slate-100 text-slate-600',
};

/** Etiqueta tipo pill. variant: navy | orange | success | danger | gray */
export default function Badge({ variant = 'gray', className = '', children }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium
        ${VARIANTS[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
