import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

/**
 * Dropdown propio (reemplaza el <select> nativo del navegador) con el estilo de la app.
 * options: [{ value, label }]. onChange recibe directamente el value seleccionado.
 * Soporta teclado (flechas, Enter, Esc) y cierre al hacer clic afuera.
 */
export default function Select({
  label,
  error,
  value,
  onChange,
  options = [],
  placeholder = 'Seleccione...',
  disabled = false,
  className = '',
}) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const ref = useRef(null);

  const selected = options.find((o) => String(o.value) === String(value));

  // Cerrar al hacer clic fuera.
  useEffect(() => {
    if (!open) return undefined;
    const onClickAway = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickAway);
    return () => document.removeEventListener('mousedown', onClickAway);
  }, [open]);

  const choose = (val) => {
    onChange?.(val);
    setOpen(false);
  };

  const handleKeyDown = (e) => {
    if (disabled) return;
    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (!open) {
          setOpen(true);
          setActiveIndex(options.findIndex((o) => String(o.value) === String(value)));
        } else if (activeIndex >= 0) {
          choose(options[activeIndex].value);
        }
        break;
      case 'ArrowDown':
        e.preventDefault();
        if (!open) setOpen(true);
        else setActiveIndex((i) => Math.min(i + 1, options.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
        break;
      case 'Escape':
        setOpen(false);
        break;
      default:
        break;
    }
  };

  return (
    <div className={className}>
      {label && <label className="mb-1 block text-sm font-medium text-navy-800">{label}</label>}

      <div className="relative" ref={ref}>
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen((o) => !o)}
          onKeyDown={handleKeyDown}
          aria-haspopup="listbox"
          aria-expanded={open}
          className={`flex w-full items-center justify-between rounded-md border bg-white px-3 py-2 text-left text-sm
            text-navy-900 transition-colors focus-brand disabled:cursor-not-allowed disabled:bg-slate-50
            ${error ? 'border-red-400' : 'border-slate-300'}
            ${open ? 'border-orange-400 ring-2 ring-orange-400' : ''}`}
        >
          <span className={selected ? '' : 'text-slate-400'}>
            {selected ? selected.label : placeholder}
          </span>
          <ChevronDown
            size={18}
            className={`text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
          />
        </button>

        {open && (
          <ul
            role="listbox"
            className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-md border border-slate-200
              bg-white py-1 shadow-lg animate-fade-in"
          >
            {options.length === 0 && (
              <li className="px-3 py-2 text-sm text-slate-400">Sin opciones</li>
            )}
            {options.map((opt, i) => {
              const isSelected = String(opt.value) === String(value);
              const isActive = i === activeIndex;
              return (
                <li
                  key={opt.value}
                  role="option"
                  aria-selected={isSelected}
                  onMouseEnter={() => setActiveIndex(i)}
                  onClick={() => choose(opt.value)}
                  className={`flex cursor-pointer items-center justify-between px-3 py-2 text-sm
                    ${isActive ? 'bg-orange-50 text-orange-700' : 'text-navy-800'}
                    ${isSelected ? 'font-medium' : ''}`}
                >
                  {opt.label}
                  {isSelected && <Check size={16} className="text-orange-500" />}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
