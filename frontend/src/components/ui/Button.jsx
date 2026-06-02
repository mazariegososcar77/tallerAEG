import Spinner from './Spinner.jsx';

const VARIANTS = {
  primary: 'bg-orange-500 text-white hover:bg-orange-600 disabled:bg-orange-300',
  navy: 'bg-navy-700 text-white hover:bg-navy-800 disabled:bg-navy-400',
  outline: 'border border-navy-200 text-navy-700 bg-white hover:bg-navy-50',
  danger: 'bg-red-600 text-white hover:bg-red-700 disabled:bg-red-300',
  ghost: 'text-navy-700 hover:bg-navy-50',
};

const SIZES = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-5 py-2.5 text-base',
};

/** Boton de marca. variant: primary | navy | outline | danger | ghost */
export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  className = '',
  children,
  ...props
}) {
  return (
    <button
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-md font-medium
        transition-colors focus-brand disabled:cursor-not-allowed
        ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...props}
    >
      {loading && <Spinner size={16} />}
      {children}
    </button>
  );
}
