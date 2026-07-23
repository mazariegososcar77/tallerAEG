import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check, Search, Plus } from 'lucide-react';

/**
 * Es otro "menú desplegable" para elegir una opción de una lista, como
 * Select.jsx, pero con dos poderes extra que se usan en pantallas como
 * Órdenes, Cotizaciones y Máquinas:
 *   - Si se le activa `searchable`, muestra una cajita de búsqueda arriba
 *     de las opciones para poder escribir y filtrar en listas largas (por
 *     ejemplo, buscar un cliente entre cientos).
 *   - Si se le pasa `onCreateNew`, agrega una opción especial "+ Nuevo" al
 *     principio de la lista, para poder crear un registro nuevo sin salir
 *     del formulario (por ejemplo, dar de alta un cliente nuevo desde ahí
 *     mismo mientras se llena una cotización).
 * También puede mostrarle a cada opción una pequeña etiqueta de color
 * (`badge`) al lado, por ejemplo para indicar un estado.
 *
 * Dropdown estilizado (reemplaza el <select> nativo) pensado para las paginas
 * densas con estilos inline (Ordenes, Cotizaciones, Maquinas, etc.). Usa las
 * mismas variables de tema (--c-*) que esas paginas, asi que encaja pixel a pixel.
 *
 * Diferencias con components/ui/Select.jsx (ese es para los formularios Tailwind):
 *   - `searchable`: muestra un buscador dentro del panel y filtra las opciones
 *     mientras se escribe (por `keywords` si viene, si no por `label`).
 *   - `onCreateNew`: agrega una fila "＋ crear nuevo" al inicio del panel.
 *   - cada opcion admite un `badge` opcional ({ text, color }).
 *
 * options: [{ value, label, keywords?, badge? }]. onChange recibe el value.
 * El panel se renderiza en un portal con posicion `fixed` para que no lo
 * recorte ningun contenedor con overflow (secciones de tarjeta, modales…).
 */
export default function Combobox({
  value,
  onChange,
  options = [],
  placeholder = 'Seleccionar...',
  disabled = false,
  searchable = false,
  onCreateNew,
  createLabel = 'Nuevo',
  size = 'sm',
  style,
  wrapperStyle,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);
  const [pos, setPos] = useState(null);
  const ref = useRef(null);       // wrapper del boton
  const btnRef = useRef(null);    // boton disparador
  const listRef = useRef(null);   // panel (en el portal)
  const searchRef = useRef(null); // input de busqueda

  const selected = options.find((o) => String(o.value) === String(value));
  const fontSize = size === 'sm' ? 12 : 13;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => String(o.keywords ?? o.label).toLowerCase().includes(q));
  }, [options, query]);

  const updatePosition = useCallback(() => {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const openUp = spaceBelow < 260 && spaceAbove > spaceBelow;
    const maxHeight = Math.min(280, (openUp ? spaceAbove : spaceBelow) - 12);
    setPos({
      left: rect.left,
      width: rect.width,
      maxHeight: Math.max(maxHeight, 120),
      ...(openUp ? { bottom: window.innerHeight - rect.top + 4 } : { top: rect.bottom + 4 }),
    });
  }, []);

  // Reposicionar al abrir y mientras este abierto.
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

  // Enfocar el buscador al abrir.
  useEffect(() => {
    if (open && searchable) {
      const t = setTimeout(() => searchRef.current?.focus(), 0);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [open, searchable]);

  // Cerrar al hacer clic fuera (boton + panel del portal).
  useEffect(() => {
    if (!open) return undefined;
    const onClickAway = (e) => {
      if (ref.current?.contains(e.target)) return;
      if (listRef.current?.contains(e.target)) return;
      close();
    };
    document.addEventListener('mousedown', onClickAway);
    return () => document.removeEventListener('mousedown', onClickAway);
  }, [open]);

  const close = () => { setOpen(false); setQuery(''); setActiveIndex(-1); };

  const toggle = () => {
    if (disabled) return;
    if (open) close();
    else { setOpen(true); setActiveIndex(filtered.findIndex((o) => String(o.value) === String(value))); }
  };

  const choose = (val) => { onChange?.(val); close(); };

  const handleCreate = () => { close(); onCreateNew?.(); };

  const handleKeyDown = (e) => {
    if (disabled) return;
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (!open) { setOpen(true); return; }
        setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
        break;
      case 'Enter':
        if (open) {
          e.preventDefault();
          if (activeIndex >= 0 && filtered[activeIndex]) choose(filtered[activeIndex].value);
        }
        break;
      case 'Escape':
        if (open) { e.preventDefault(); close(); }
        break;
      default:
        break;
    }
  };

  const triggerStyle = {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    background: 'var(--c-surface-2)',
    border: '1px solid ' + (open ? '#EE7440' : 'var(--c-line)'),
    boxShadow: open ? '0 0 0 2px rgba(238,116,64,.35)' : 'none',
    color: 'var(--c-text)',
    padding: '8px 10px',
    borderRadius: 6,
    fontSize,
    lineHeight: 1.3,
    cursor: disabled ? 'not-allowed' : 'pointer',
    outline: 'none',
    boxSizing: 'border-box',
    textAlign: 'left',
    opacity: disabled ? 0.6 : 1,
    ...style,
  };

  return (
    <div style={{ position: 'relative', ...wrapperStyle }} ref={ref}>
      <button
        ref={btnRef}
        type="button"
        disabled={disabled}
        onClick={toggle}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        style={triggerStyle}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: selected ? 'var(--c-text)' : 'var(--c-muted)' }}>
            {selected ? selected.label : placeholder}
          </span>
          {selected?.badge && <Badge badge={selected.badge} />}
        </span>
        <ChevronDown size={16} style={{ color: 'var(--c-muted)', flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} />
      </button>

      {open && pos && createPortal(
        <div
          ref={listRef}
          role="listbox"
          onKeyDown={handleKeyDown}
          style={{
            position: 'fixed',
            left: pos.left,
            width: pos.width,
            maxHeight: pos.maxHeight,
            ...(pos.top != null ? { top: pos.top } : { bottom: pos.bottom }),
            zIndex: 70,
            background: 'var(--c-surface)',
            border: '1px solid var(--c-line)',
            borderRadius: 8,
            boxShadow: '0 10px 30px rgba(0,0,0,.28)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
          className="animate-fade-in"
        >
          {searchable && (
            <div style={{ position: 'relative', borderBottom: '1px solid var(--c-line)', flexShrink: 0 }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--c-muted)' }} />
              <input
                ref={searchRef}
                value={query}
                onChange={(e) => { setQuery(e.target.value); setActiveIndex(0); }}
                onKeyDown={handleKeyDown}
                placeholder="Buscar..."
                style={{ width: '100%', background: 'var(--c-surface-2)', border: 'none', color: 'var(--c-text)', padding: '9px 10px 9px 30px', fontSize, outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
          )}

          <div style={{ overflowY: 'auto', flex: 1, padding: '4px 0' }}>
            {onCreateNew && (
              <button
                type="button"
                onClick={handleCreate}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'transparent', border: 'none', borderBottom: '1px solid var(--c-line)', color: '#CA8A04', fontSize, fontWeight: 700, cursor: 'pointer', textAlign: 'left' }}
              >
                <Plus size={15} /> {createLabel}
              </button>
            )}

            {filtered.length === 0 ? (
              <p style={{ padding: '10px 12px', fontSize, color: 'var(--c-muted)', margin: 0 }}>Sin resultados</p>
            ) : filtered.map((opt, i) => {
              const isSelected = String(opt.value) === String(value);
              const isActive = i === activeIndex;
              return (
                <div
                  key={opt.value}
                  role="option"
                  aria-selected={isSelected}
                  onMouseEnter={() => setActiveIndex(i)}
                  onClick={() => choose(opt.value)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 8,
                    padding: '8px 12px',
                    fontSize,
                    cursor: 'pointer',
                    background: isActive ? 'var(--c-hover)' : 'transparent',
                    color: isActive ? '#CA8A04' : 'var(--c-text)',
                    fontWeight: isSelected ? 600 : 400,
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{opt.label}</span>
                    {opt.badge && <Badge badge={opt.badge} />}
                  </span>
                  {isSelected && <Check size={15} style={{ color: '#CA8A04', flexShrink: 0 }} />}
                </div>
              );
            })}
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}

function Badge({ badge }) {
  const color = badge.color || '#64748B';
  return (
    <span style={{ flexShrink: 0, background: color + '22', color, border: '1px solid ' + color + '55', borderRadius: 20, padding: '1px 7px', fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap' }}>
      {badge.text}
    </span>
  );
}
