import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Es el calendario para elegir una fecha (por ejemplo, la fecha de un
 * mantenimiento). Al hacer clic se abre un mini-calendario donde se puede
 * cambiar de mes, saltar directo a un año, elegir "Hoy" o limpiar la fecha.
 * Se hizo a la medida en vez de usar el selector de fecha típico del
 * navegador, para que se vea igual en todas las pantallas del sistema.
 *
 * Selector de fecha propio (reemplaza el <input type="date"> nativo del navegador)
 * con el estilo de la app. `value`/`onChange` trabajan con cadenas 'YYYY-MM-DD'.
 * Soporta navegacion de mes, salto rapido de anio y cierre al hacer clic afuera.
 */
const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const DOW = ['Do','Lu','Ma','Mi','Ju','Vi','Sa'];
const pad = (n) => String(n).padStart(2, '0');

export default function DatePicker({
  label,
  error,
  value,
  onChange,
  placeholder = 'Seleccione fecha...',
  disabled = false,
  className = '',
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState('days'); // 'days' | 'years'
  const [pos, setPos] = useState(null);
  const ref = useRef(null);       // wrapper del boton (para el clic afuera)
  const btnRef = useRef(null);    // boton disparador (para medir su posicion)
  const panelRef = useRef(null);  // panel del calendario (en el portal)
  const today = new Date();

  const parsed = useMemo(() => {
    if (!value) return null;
    const [y, m, d] = String(value).slice(0, 10).split('-').map(Number);
    if (!y || !m || !d) return null;
    return { y, m: m - 1, d };
  }, [value]);

  const [viewYear, setViewYear] = useState(parsed?.y ?? today.getFullYear());
  const [viewMonth, setViewMonth] = useState(parsed?.m ?? today.getMonth());

  // Calcula donde poner el panel (arriba o abajo del boton, y sin salirse por
  // los lados de la pantalla) en coordenadas fijas de viewport. Se hace en un
  // portal con position:fixed -- igual que Combobox.jsx -- para que ni un
  // contenedor angosto (columnas de filtro en celular) ni uno con overflow
  // recortado (las tarjetas "sec" que se usan en todo el sistema) lo corten
  // o lo empujen fuera de la pantalla.
  const updatePosition = useCallback(() => {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const POPOVER_W = Math.min(300, window.innerWidth - 16);
    const POPOVER_H = 340;
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const openUp = spaceBelow < POPOVER_H && spaceAbove > spaceBelow;
    const maxLeft = window.innerWidth - POPOVER_W - 8;
    const left = Math.min(Math.max(rect.left, 8), Math.max(maxLeft, 8));
    setPos({
      left,
      width: POPOVER_W,
      ...(openUp ? { bottom: window.innerHeight - rect.top + 4 } : { top: rect.bottom + 4 }),
    });
  }, []);

  // Al abrir, sincroniza la vista con el valor seleccionado y calcula la posicion;
  // mientras este abierto, la recalcula si la pantalla hace scroll o cambia de tamano.
  useEffect(() => {
    if (!open) return undefined;
    setMode('days');
    if (parsed) { setViewYear(parsed.y); setViewMonth(parsed.m); }
    updatePosition();
    const onScroll = () => updatePosition();
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
    };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cerrar al hacer clic fuera (boton + panel del portal) o con Escape.
  useEffect(() => {
    if (!open) return undefined;
    const onAway = (e) => {
      if (ref.current?.contains(e.target)) return;
      if (panelRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onAway);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onAway);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const cells = useMemo(() => {
    const firstWeekday = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const arr = [];
    for (let i = 0; i < firstWeekday; i++) arr.push(null);
    for (let d = 1; d <= daysInMonth; d++) arr.push(d);
    return arr;
  }, [viewYear, viewMonth]);

  const yearGrid = useMemo(() => {
    const start = viewYear - 6;
    return Array.from({ length: 12 }, (_, i) => start + i);
  }, [viewYear]);

  const todayKey = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
  const selectedKey = parsed ? `${parsed.y}-${pad(parsed.m + 1)}-${pad(parsed.d)}` : null;

  const prevMonth = () => setViewMonth(m => { if (m === 0) { setViewYear(y => y - 1); return 11; } return m - 1; });
  const nextMonth = () => setViewMonth(m => { if (m === 11) { setViewYear(y => y + 1); return 0; } return m + 1; });

  const choose = (day) => {
    onChange?.(`${viewYear}-${pad(viewMonth + 1)}-${pad(day)}`);
    setOpen(false);
  };
  const pickToday = () => {
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
    onChange?.(todayKey);
    setOpen(false);
  };
  const clear = () => { onChange?.(''); setOpen(false); };

  const display = parsed ? `${pad(parsed.d)}/${pad(parsed.m + 1)}/${parsed.y}` : placeholder;

  const navBtn = 'flex h-7 w-7 items-center justify-center rounded-md text-muted hover:bg-hover hover:text-content';

  return (
    <div className={className}>
      {label && <label className="mb-1 block text-sm font-medium text-muted">{label}</label>}

      <div className="relative" ref={ref}>
        <button
          ref={btnRef}
          type="button"
          disabled={disabled}
          onClick={() => setOpen(o => !o)}
          className={`flex w-full items-center justify-between rounded-md border bg-surface2 px-3 py-2 text-left text-sm
            text-content transition-colors focus-brand disabled:cursor-not-allowed disabled:opacity-60
            ${error ? 'border-red-400' : 'border-line'}
            ${open ? 'border-orange-400 ring-2 ring-orange-400' : ''}`}
        >
          <span className={parsed ? '' : 'text-slate-400'}>{display}</span>
          <CalendarIcon size={16} className="text-slate-400" />
        </button>

        {open && pos && createPortal(
          <div
            ref={panelRef}
            className="rounded-md border border-line bg-surface p-3 shadow-lg animate-fade-in"
            style={{ position:'fixed', left:pos.left, width:pos.width, zIndex:70, ...(pos.top != null ? { top:pos.top } : { bottom:pos.bottom }) }}
          >
            {/* Cabecera */}
            <div className="mb-2 flex items-center justify-between">
              <button type="button" onClick={prevMonth} className={navBtn} aria-label="Mes anterior"><ChevronLeft size={16} /></button>
              <button
                type="button"
                onClick={() => setMode(mode === 'days' ? 'years' : 'days')}
                className="rounded-md px-2 py-1 text-sm font-semibold text-content hover:bg-hover"
              >
                {mode === 'days' ? `${MONTHS[viewMonth]} ${viewYear}` : `${yearGrid[0]} - ${yearGrid[yearGrid.length - 1]}`}
              </button>
              <button type="button" onClick={nextMonth} className={navBtn} aria-label="Mes siguiente"><ChevronRight size={16} /></button>
            </div>

            {mode === 'days' ? (
              <>
                <div className="mb-1 grid grid-cols-7 gap-1">
                  {DOW.map(d => (
                    <span key={d} className="text-center text-[10px] font-bold uppercase text-muted">{d}</span>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {cells.map((day, i) => {
                    if (day === null) return <span key={'b' + i} />;
                    const key = `${viewYear}-${pad(viewMonth + 1)}-${pad(day)}`;
                    const isSelected = key === selectedKey;
                    const isToday = key === todayKey;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => choose(day)}
                        className={`flex h-8 items-center justify-center rounded-md text-sm transition-colors
                          ${isSelected
                            ? 'bg-orange-500 font-semibold text-white'
                            : isToday
                              ? 'border border-orange-400 text-content hover:bg-hover'
                              : 'text-content hover:bg-hover'}`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="grid grid-cols-3 gap-1">
                {yearGrid.map(y => (
                  <button
                    key={y}
                    type="button"
                    onClick={() => { setViewYear(y); setMode('days'); }}
                    className={`flex h-9 items-center justify-center rounded-md text-sm transition-colors
                      ${y === viewYear ? 'bg-orange-500 font-semibold text-white' : 'text-content hover:bg-hover'}`}
                  >
                    {y}
                  </button>
                ))}
              </div>
            )}

            {/* Pie: accesos rapidos */}
            <div className="mt-2 flex items-center justify-between border-t border-line pt-2">
              <button type="button" onClick={clear} className="rounded-md px-2 py-1 text-xs font-medium text-muted hover:bg-hover hover:text-content">Limpiar</button>
              <button type="button" onClick={pickToday} className="rounded-md px-2 py-1 text-xs font-semibold text-orange-500 hover:bg-hover">Hoy</button>
            </div>
          </div>,
          document.body,
        )}
      </div>

      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
}
