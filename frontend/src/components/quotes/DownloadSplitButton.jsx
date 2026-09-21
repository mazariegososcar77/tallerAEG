import { useState, useRef, useEffect } from 'react';
import { Download, ChevronDown } from 'lucide-react';

/**
 * Boton dividido para descargar el PDF de una cotizacion: la parte grande
 * descarga "Sin descuento" (lo de siempre); la flecha abre un menu con
 * "Sin descuento" / "Con descuento". `onDownload(withDiscount)` recibe true
 * solo para "Con descuento".
 */
export default function DownloadSplitButton({ onDownload }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const away = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', away);
    return () => document.removeEventListener('mousedown', away);
  }, [open]);

  const pick = (withDiscount) => { setOpen(false); onDownload(withDiscount); };
  const btn = { background: 'var(--c-surface-2)', border: 'none', padding: '7px 8px', cursor: 'pointer', color: '#10b981', display: 'flex', alignItems: 'center' };
  const item = { display: 'block', width: '100%', textAlign: 'left', background: 'transparent', border: 'none', padding: '8px 12px', fontSize: 12, cursor: 'pointer', color: 'var(--c-text)', whiteSpace: 'nowrap' };

  return (
    <div ref={ref} style={{ position: 'relative', display: 'flex' }}>
      <button type="button" onClick={() => pick(false)} title="Descargar PDF (sin descuento)" style={{ ...btn, borderRadius: '7px 0 0 7px', padding: '7px 10px' }}>
        <Download size={16} />
      </button>
      <button type="button" onClick={() => setOpen((o) => !o)} title="Mas opciones de descarga" aria-haspopup="menu" aria-expanded={open}
        style={{ ...btn, borderRadius: '0 7px 7px 0', borderLeft: '1px solid var(--c-line)' }}>
        <ChevronDown size={14} />
      </button>
      {open && (
        <div role="menu" style={{ position: 'absolute', right: 0, top: '100%', marginTop: 4, zIndex: 40, background: 'var(--c-surface)', border: '1px solid var(--c-line)', borderRadius: 8, boxShadow: '0 10px 30px rgba(0,0,0,.28)', overflow: 'hidden' }}>
          <button type="button" role="menuitem" style={item} onClick={() => pick(false)}>Sin descuento</button>
          <button type="button" role="menuitem" style={item} onClick={() => pick(true)}>Con descuento</button>
        </div>
      )}
    </div>
  );
}
