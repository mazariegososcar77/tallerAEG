import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check } from 'lucide-react';

/**
 * Dropdown propio (reemplaza el <select> nativo del navegador) con el estilo de la app.
 * options: [{ value, label }]. onChange recibe directamente el value seleccionado.
 * Soporta teclado (flechas, Enter, Esc) y cierre al hacer clic afuera.
 *
 * El panel de opciones se renderiza en un portal con posición `fixed` para que
 * no lo recorte ningún contenedor con overflow (p. ej. el cuerpo de un Modal).
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
  const [pos, setPos] = useState(null); // { left, width, top?|bottom?, maxHeight }
  const ref = useRef(null);       // wrapper del botón
  const btnRef = useRef(null);    // botón disparador
  const listRef = useRef(null);   // panel de opciones (en el portal)

  const selected = options.find((o) => String(o.value) === String(value));

  // Calcula la posición del panel a partir del botón, decidiendo si abre hacia
  // abajo o hacia arriba según el espacio disponible en la ventana.
  const updatePosition = useCallback(() => {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const openUp = spaceBelow < 240 && spaceAbove > spaceBelow;
    const maxHeight = Math.min(224, (openUp ? spaceAbove : spaceBelow) - 12);
    setPos({
      left: rect.left,
      width: rect.width,
      maxHeight: Math.max(maxHeight, 80),
      ...(openUp
        ? { bottom: window.innerHeight - rect.top + 4 }
        : { top: rect.bottom + 4 }),
    });
  }, []);

  // Reposicionar al abrir y mientras esté abierto (scroll/resize de la ventana).
  useEffect(() => {
    if (!open) return undefined;
    updatePosition();
    const onScroll = () => updatePosition();
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
    };
  }, [open, updatePosition]);

  // Cerrar al hacer clic fuera (considera botón y panel, que vive en el portal).
  useEffect(() => {
    if (!open) return undefined;
    const onClickAway = (e) => {
      if (ref.current?.contains(e.target)) return;
      if (listRef.current?.contains(e.target)) return;
      setOpen(false);
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
      {label && <label className="mb-1 block text-sm font-medium text-muted">{label}</label>}

      <div className="relative" ref={ref}>
        <button
          ref={btnRef}
          type="button"
          disabled={disabled}
          onClick={() => setOpen((o) => !o)}
          onKeyDown={handleKeyDown}
          aria-haspopup="listbox"
          aria-expanded={open}
          className={`flex w-full items-center justify-between rounded-md border bg-surface2 px-3 py-2 text-left text-sm
            text-content transition-colors focus-brand disabled:cursor-not-allowed disabled:opacity-60
            ${error ? 'border-red-400' : 'border-line'}
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

        {open && pos && createPortal(
          <ul
            ref={listRef}
            role="listbox"
            style={{
              position: 'fixed',
              left: pos.left,
              width: pos.width,
              maxHeight: pos.maxHeight,
              ...(pos.top != null ? { top: pos.top } : { bottom: pos.bottom }),
            }}
            className="z-[60] overflow-auto rounded-md border border-line bg-surface py-1 shadow-lg animate-fade-in"
          >
            {options.length === 0 && (
              <li className="px-3 py-2 text-sm text-muted">Sin opciones</li>
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
                    ${isActive ? 'bg-hover text-orange-400' : 'text-content'}
                    ${isSelected ? 'font-medium' : ''}`}
                >
                  {opt.label}
                  {isSelected && <Check size={16} className="text-orange-500" />}
                </li>
              );
            })}
          </ul>,
          document.body,
        )}
      </div>

      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
