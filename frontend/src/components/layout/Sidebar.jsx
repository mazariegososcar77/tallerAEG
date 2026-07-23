import { useState, useRef, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { ChevronsLeft, ChevronsRight, ChevronRight } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth.js';
import { NAV } from '../../lib/nav.js';

const STORAGE_KEY = 'taller_aeg_sidebar_collapsed';

const childClass = ({ isActive }) =>
  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ' +
  (isActive ? 'bg-orange-500 text-white' : 'text-navy-100 hover:bg-navy-600');

export default function Sidebar({ mobileOpen, onClose }) {
  const { hasPermission } = useAuth();
  const location = useLocation();
  const asideRef = useRef(null);
  const flyoutRef = useRef(null);
  const subFlyoutRef = useRef(null);
  // "collapsed" recuerda (guardandolo en el navegador) si el usuario prefiere
  // el menu angosto (solo iconos) o completo; asi la preferencia se mantiene
  // aunque cierre y vuelva a abrir el sistema.
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(STORAGE_KEY) === '1');
  const [openGroup, setOpenGroup] = useState(null); // label del grupo abierto (acordeon)
  const [flyoutPos, setFlyoutPos] = useState(null); // { top, left } del flyout en escritorio
  const [openSubgroup, setOpenSubgroup] = useState(null); // label del subgrupo abierto (2do nivel, ej. "Pre"/"Post")
  const [subFlyoutPos, setSubFlyoutPos] = useState(null); // { top, left } del segundo flyout

  const slim = collapsed && !mobileOpen; // true = mostrar el menu angosto (solo iconos)

  // Cambia entre menu angosto y menu completo, y guarda la preferencia.
  const toggleCollapsed = () => {
    setOpenGroup(null);
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
      return next;
    });
  };

  // Cierra los flyouts al hacer clic fuera o al redimensionar (la posicion fija quedaria desfasada).
  useEffect(() => {
    if (!openGroup) return undefined;
    const onDocClick = (e) => {
      if (
        asideRef.current?.contains(e.target) ||
        flyoutRef.current?.contains(e.target) ||
        subFlyoutRef.current?.contains(e.target)
      ) return;
      setOpenGroup(null);
      setOpenSubgroup(null);
    };
    const onResize = () => { setOpenGroup(null); setOpenSubgroup(null); };
    document.addEventListener('mousedown', onDocClick);
    window.addEventListener('resize', onResize);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      window.removeEventListener('resize', onResize);
    };
  }, [openGroup]);

  // Cierra menus al cambiar de ruta.
  useEffect(() => { setOpenGroup(null); setOpenSubgroup(null); }, [location.pathname]);

  const handleNavigate = () => { setOpenGroup(null); setOpenSubgroup(null); onClose?.(); };

  const handleGroupClick = (label, e) => {
    setOpenSubgroup(null);
    if (openGroup === label) { setOpenGroup(null); return; }
    const asideRect = asideRef.current?.getBoundingClientRect();
    const btnRect = e.currentTarget.getBoundingClientRect();
    const top = Math.max(8, Math.min(btnRect.top, window.innerHeight - 240));
    setFlyoutPos({ top, left: (asideRect?.right ?? 0) + 4 });
    setOpenGroup(label);
  };

  // Igual que handleGroupClick, pero para un subgrupo (2do nivel): el segundo
  // flyout se ancla a la derecha del primer flyout, no del sidebar.
  const handleSubgroupClick = (label, e) => {
    if (openSubgroup === label) { setOpenSubgroup(null); return; }
    const flyoutRect = flyoutRef.current?.getBoundingClientRect();
    const btnRect = e.currentTarget.getBoundingClientRect();
    const top = Math.max(8, Math.min(btnRect.top, window.innerHeight - 240));
    setSubFlyoutPos({ top, left: (flyoutRect?.right ?? 0) + 4 });
    setOpenSubgroup(label);
  };

  // ¿Alguno de los items de este (sub)grupo, entrando en los anidados, es la ruta activa?
  const groupContainsPath = (items, path) =>
    items.some((i) => (i.type === 'group' ? groupContainsPath(i.items, path) : path.startsWith(i.to)));

  // Un item de la lista puede ser un enlace normal o, a un nivel mas, otro
  // grupo (ej. "Pre"/"Post" dentro de "Operaciones"): en ese caso se dibuja
  // como un boton que abre el segundo flyout en vez de un NavLink.
  const renderChild = (item) => {
    if (item.type === 'group') {
      const isOpen = openSubgroup === item.label;
      const containsActive = groupContainsPath(item.items, location.pathname);
      const SubIcon = item.icon;
      return (
        <div key={item.label} className="relative">
          <button
            type="button"
            onClick={(e) => handleSubgroupClick(item.label, e)}
            aria-expanded={isOpen}
            className={
              'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors ' +
              (isOpen || containsActive ? 'bg-navy-600 text-white' : 'text-navy-100 hover:bg-navy-600')
            }
          >
            <SubIcon size={18} className="shrink-0" />
            <span className="flex-1 truncate">{item.label}</span>
            <ChevronRight size={14} className={'shrink-0 transition-transform ' + (isOpen ? 'rotate-90' : '')} />
          </button>
          {/* Movil: expansion en linea anidada (acordeon dentro de acordeon) */}
          {isOpen && (
            <div className="mt-1 space-y-1 pl-3 lg:hidden">
              {item.items.map(renderChild)}
            </div>
          )}
        </div>
      );
    }
    const { to, label, icon: ItemIcon } = item;
    return (
      <NavLink key={to} to={to} className={childClass} onClick={handleNavigate}>
        <ItemIcon size={18} className="shrink-0" />
        <span className="truncate">{label}</span>
      </NavLink>
    );
  };

  // Arma el menu que realmente se va a mostrar, segun los permisos del
  // usuario: para un item suelto (como "Dashboard"), lo deja pasar solo si
  // tiene el permiso requerido. Para un grupo (como "Operaciones"), primero
  // filtra sus opciones internas dejando solo las que el usuario puede ver
  // (un item puede ser, a su vez, otro grupo anidado -- se filtra igual,
  // recursivamente); si al final el grupo se queda sin ninguna opcion
  // visible, el grupo completo se oculta (no tiene sentido mostrar un
  // titulo vacio).
  const filterItems = (items) =>
    items
      .map((i) => {
        if (i.type === 'group') {
          const inner = filterItems(i.items);
          return inner.length ? { ...i, items: inner } : null;
        }
        return hasPermission(i.permission) ? i : null;
      })
      .filter(Boolean);

  const groups = NAV
    .map((entry) => {
      if (entry.type === 'item') {
        return hasPermission(entry.permission) ? entry : null;
      }
      const items = filterItems(entry.items);
      return items.length ? { ...entry, items } : null;
    })
    .filter(Boolean);

  const openGroupData = groups.find((g) => g.type === 'group' && g.label === openGroup);
  const openSubgroupData = openGroupData?.items.find((i) => i.type === 'group' && i.label === openSubgroup);

  return (
    <>
      {mobileOpen && (
        <div className="fixed inset-0 z-30 bg-navy-900/50 lg:hidden" onClick={onClose} />
      )}
      <aside
        ref={asideRef}
        className={'fixed inset-y-0 left-0 z-40 flex transform flex-col bg-navy-700 transition-all duration-200 lg:static lg:translate-x-0 ' + (slim ? 'w-20' : 'w-64') + ' ' + (mobileOpen ? 'translate-x-0' : '-translate-x-full')}
      >
        <div className={'flex items-center px-5 py-5 ' + (slim ? 'justify-center' : 'gap-3')}>
          <img src="/logo.png" alt="Taller AEG" className="h-11 w-11 shrink-0 rounded-lg bg-white p-1" />
          {!slim && (
            <div className="leading-tight">
              <p className="font-bold text-white">Taller AEG</p>
              <p className="text-xs text-navy-200">Panel de administracion</p>
            </div>
          )}
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
          {groups.map((entry) => {
            if (entry.type === 'item') {
              const Icon = entry.icon;
              return (
                <NavLink
                  key={entry.to}
                  to={entry.to}
                  title={slim ? entry.label : undefined}
                  className={({ isActive }) =>
                    'flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ' +
                    (slim ? 'justify-center ' : 'gap-3 ') +
                    (isActive ? 'bg-orange-500 text-white' : 'text-navy-100 hover:bg-navy-600')
                  }
                  onClick={handleNavigate}
                >
                  <Icon size={20} className="shrink-0" />
                  {!slim && <span className="truncate">{entry.label}</span>}
                </NavLink>
              );
            }

            const GIcon = entry.icon;
            const isOpen = openGroup === entry.label;
            const containsActive = groupContainsPath(entry.items, location.pathname);
            return (
              <div key={entry.label} className="relative">
                <button
                  type="button"
                  onClick={(e) => handleGroupClick(entry.label, e)}
                  title={slim ? entry.label : undefined}
                  aria-expanded={isOpen}
                  className={
                    'flex w-full items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ' +
                    (slim ? 'justify-center ' : 'gap-3 ') +
                    (isOpen || containsActive ? 'bg-navy-600 text-white' : 'text-navy-100 hover:bg-navy-600')
                  }
                >
                  <GIcon size={20} className="shrink-0" />
                  {!slim && <span className="flex-1 truncate text-left">{entry.label}</span>}
                  {!slim && (
                    <ChevronRight size={16} className={'shrink-0 transition-transform ' + (isOpen ? 'rotate-90' : '')} />
                  )}
                </button>

                {/* Movil: expansion en linea (acordeon) */}
                {isOpen && (
                  <div className="mt-1 space-y-1 pl-3 lg:hidden">
                    {entry.items.map(renderChild)}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <button
          onClick={toggleCollapsed}
          className={'hidden items-center border-t border-navy-600 px-5 py-4 text-sm font-medium text-navy-100 transition-colors hover:bg-navy-600 lg:flex ' + (slim ? 'justify-center' : 'gap-3')}
          title={slim ? 'Expandir' : 'Contraer'}
        >
          {slim ? <ChevronsRight size={20} /> : <ChevronsLeft size={20} />}
          {!slim && 'Contraer'}
        </button>
      </aside>

      {/* Escritorio: flyout del submenu a la derecha del sidebar */}
      {openGroupData && flyoutPos && (
        <div
          ref={flyoutRef}
          style={{ top: flyoutPos.top, left: flyoutPos.left }}
          className="fixed z-50 hidden max-h-[80vh] w-60 overflow-y-auto rounded-xl border border-navy-600 bg-navy-700 p-2 shadow-2xl animate-fade-in lg:block"
        >
          <p className="px-2 py-1.5 text-xs font-bold uppercase tracking-wide text-navy-200">
            {openGroupData.label}
          </p>
          <div className="space-y-1">
            {openGroupData.items.map(renderChild)}
          </div>
        </div>
      )}

      {/* Escritorio: segundo flyout anidado (ej. Pre/Post dentro de Operaciones) */}
      {openSubgroupData && subFlyoutPos && (
        <div
          ref={subFlyoutRef}
          style={{ top: subFlyoutPos.top, left: subFlyoutPos.left }}
          className="fixed z-50 hidden max-h-[80vh] w-60 overflow-y-auto rounded-xl border border-navy-600 bg-navy-700 p-2 shadow-2xl animate-fade-in lg:block"
        >
          <p className="px-2 py-1.5 text-xs font-bold uppercase tracking-wide text-navy-200">
            {openSubgroupData.label}
          </p>
          <div className="space-y-1">
            {openSubgroupData.items.map(renderChild)}
          </div>
        </div>
      )}
    </>
  );
}
