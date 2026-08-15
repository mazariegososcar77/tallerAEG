import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Plus } from 'lucide-react';

/**
 * Es un campo de texto libre que, mientras se escribe, sugiere artículos del
 * catálogo (como un buscador), pero sin obligar a elegir uno: el usuario
 * puede quedarse con lo que escribió (p.ej. "WD-40", algo que Abdías compra
 * afuera y no está dado de alta como artículo) o elegir una sugerencia para
 * que se rellene con el nombre de ese artículo. Después de elegir, el texto
 * sigue siendo editable con toda libertad -- no queda "atado" al artículo
 * elegido, porque nunca se guarda un vínculo, solo el texto.
 *
 * A diferencia de components/ui/Combobox.jsx (un <button> que abre un panel
 * con su propio buscador interno), acá el input ES el buscador: no hay dos
 * cajitas, una sola.
 *
 * Props:
 * - value / onChange: igual que un <input> normal (onChange recibe el
 *   evento nativo, así sigue funcionando con withUppercase() como hoy).
 * - articles: lista de artículos del catálogo [{ id, name, price, quantity }].
 * - onPick(article): se llama al elegir una sugerencia (clic o Enter).
 * - onCreateNew: si viene, agrega la fila fija "＋ crear nuevo" arriba del todo.
 */
export default function AutocompleteInput({
  value,
  onChange,
  articles = [],
  onPick,
  onCreateNew,
  createLabel = 'Crear nuevo',
  placeholder,
  style,
}) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [pos, setPos] = useState(null);
  const wrapRef = useRef(null);
  const inputRef = useRef(null);
  const panelRef = useRef(null);

  const filtered = useMemo(() => {
    const q = (value || '').trim().toLowerCase();
    if (!q) return articles;
    return articles.filter((a) => a.name.toLowerCase().includes(q));
  }, [articles, value]);

  const updatePosition = useCallback(() => {
    if (!inputRef.current) return;
    const rect = inputRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const openUp = spaceBelow < 240 && spaceAbove > spaceBelow;
    const maxHeight = Math.min(260, (openUp ? spaceAbove : spaceBelow) - 12);
    setPos({
      left: rect.left,
      width: rect.width,
      maxHeight: Math.max(maxHeight, 120),
      ...(openUp ? { bottom: window.innerHeight - rect.top + 4 } : { top: rect.bottom + 4 }),
    });
  }, []);

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

  // Cerrar al hacer clic fuera (input + panel del portal).
  useEffect(() => {
    if (!open) return undefined;
    const onClickAway = (e) => {
      if (wrapRef.current?.contains(e.target)) return;
      if (panelRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onClickAway);
    return () => document.removeEventListener('mousedown', onClickAway);
  }, [open]);

  const pick = (article) => {
    onPick?.(article);
    setOpen(false);
    setActiveIndex(-1);
    inputRef.current?.focus();
  };

  const handleCreate = () => {
    setOpen(false);
    setActiveIndex(-1);
    onCreateNew?.();
  };

  const rowCount = filtered.length + (onCreateNew ? 1 : 0);

  const handleKeyDown = (e) => {
    switch (e.key) {
      case 'ArrowDown':
        if (!open) { e.preventDefault(); setOpen(true); return; }
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, rowCount - 1));
        break;
      case 'ArrowUp':
        if (open) { e.preventDefault(); setActiveIndex((i) => Math.max(i - 1, 0)); }
        break;
      case 'Enter': {
        if (!open || activeIndex < 0) return;
        e.preventDefault();
        if (onCreateNew && activeIndex === 0) { handleCreate(); return; }
        const article = filtered[onCreateNew ? activeIndex - 1 : activeIndex];
        if (article) pick(article);
        break;
      }
      case 'Escape':
        if (open) { e.preventDefault(); setOpen(false); setActiveIndex(-1); }
        break;
      default:
        break;
    }
  };

  return (
    <div style={{ position: 'relative' }} ref={wrapRef}>
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => { onChange(e); if (!open) setOpen(true); setActiveIndex(-1); }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoComplete="off"
        style={style}
      />

      {open && pos && createPortal(
        <div
          ref={panelRef}
          role="listbox"
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
            overflowY: 'auto',
            padding: '4px 0',
          }}
          className="animate-fade-in"
        >
          {onCreateNew && (
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleCreate}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: activeIndex === 0 ? 'var(--c-hover)' : 'transparent', border: 'none', borderBottom: '1px solid var(--c-line)', color: '#CA8A04', fontSize: 12, fontWeight: 700, cursor: 'pointer', textAlign: 'left' }}
            >
              <Plus size={15} /> {createLabel}
            </button>
          )}

          {filtered.length === 0 ? (
            <p style={{ padding: '10px 12px', fontSize: 12, color: 'var(--c-muted)', margin: 0 }}>
              Sin resultados en el catalogo -- se usara el texto escrito
            </p>
          ) : filtered.map((article, i) => {
            const idx = onCreateNew ? i + 1 : i;
            const isActive = idx === activeIndex;
            return (
              <div
                key={article.id}
                role="option"
                onMouseEnter={() => setActiveIndex(idx)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(article)}
                style={{
                  padding: '8px 12px',
                  fontSize: 12,
                  cursor: 'pointer',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  background: isActive ? 'var(--c-hover)' : 'transparent',
                  color: isActive ? '#CA8A04' : 'var(--c-text)',
                }}
              >
                {article.name}
                {Number(article.price) > 0 ? ` — Q${Number(article.price).toFixed(2)}` : ''}
                {Number(article.quantity) === 0 ? ' (sin stock)' : ''}
              </div>
            );
          })}
        </div>,
        document.body,
      )}
    </div>
  );
}
