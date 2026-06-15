import { useState, useRef, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Package, Tags, Warehouse, Users, ShieldCheck, KeyRound,
  Contact, UserCog, Award, ChevronsLeft, ChevronsRight, ChevronRight,
  ClipboardList, Wrench, Calendar, FileText, Settings, Briefcase, Boxes,
  HeartHandshake, SlidersHorizontal, Cog, ListChecks,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth.js';

const STORAGE_KEY = 'taller_aeg_sidebar_collapsed';

/**
 * Estructura del menu. Un item suelto (Dashboard) y varios grupos colapsables.
 * Los grupos se expanden en un flyout a la derecha del sidebar (acordeon: solo
 * uno abierto a la vez). En movil se expanden en linea.
 */
const NAV = [
  { type: 'item', to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, permission: 'dashboard.view' },
  {
    type: 'group', label: 'Operaciones', icon: Briefcase,
    items: [
      { to: '/clientes',      label: 'Clientes',           icon: Contact,       permission: 'clients.view' },
      { to: '/cotizaciones',  label: 'Cotizaciones',       icon: FileText,      permission: 'dashboard.view' },
      { to: '/ordenes',       label: 'Ordenes de Trabajo', icon: ClipboardList, permission: 'dashboard.view' },
    ],
  },
  {
    type: 'group', label: 'Inventario', icon: Package,
    items: [
      { to: '/inventario',            label: 'Inventario',        icon: Boxes,     permission: 'articles.view' },
      { to: '/configuracion/bodegas', label: 'Bodegas',           icon: Warehouse, permission: 'warehouses.view' },
      { to: '/configuracion/tipos',   label: 'Tipos de articulo', icon: Tags,      permission: 'article-types.view' },
    ],
  },
  {
    type: 'group', label: 'Servicios', icon: Wrench,
    items: [
      { to: '/maquinas',        label: 'Maquinas',       icon: Cog,      permission: 'dashboard.view' },
      { to: '/mantenimientos',  label: 'Mantenimientos', icon: Calendar, permission: 'dashboard.view' },
    ],
  },
  {
    type: 'group', label: 'CRM', icon: HeartHandshake,
    items: [
      { to: '/configuracion/tipos-cliente', label: 'Tipos de cliente', icon: UserCog, permission: 'client-types.view' },
      { to: '/configuracion/fidelizacion',  label: 'Fidelizacion',     icon: Award,   permission: 'loyalty.view' },
    ],
  },
  {
    type: 'group', label: 'Administracion', icon: ShieldCheck,
    items: [
      { to: '/usuarios', label: 'Usuarios', icon: Users,      permission: 'users.view' },
      { to: '/roles',    label: 'Roles',    icon: ShieldCheck, permission: 'roles.view' },
      { to: '/permisos', label: 'Permisos', icon: KeyRound,   permission: 'permissions.view' },
    ],
  },
  {
    type: 'group', label: 'Configuracion', icon: Settings,
    items: [
      { to: '/configuracion/general',    label: 'Configuracion general', icon: SlidersHorizontal, permission: 'dashboard.view' },
      { to: '/configuracion/parametros', label: 'Parametros del sistema', icon: Cog,              permission: 'dashboard.view' },
      { to: '/configuracion/catalogos',  label: 'Catalogos',             icon: ListChecks,        permission: 'dashboard.view' },
    ],
  },
];

const childClass = ({ isActive }) =>
  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ' +
  (isActive ? 'bg-orange-500 text-white' : 'text-navy-100 hover:bg-navy-600');

export default function Sidebar({ mobileOpen, onClose }) {
  const { hasPermission } = useAuth();
  const location = useLocation();
  const asideRef = useRef(null);
  const flyoutRef = useRef(null);
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(STORAGE_KEY) === '1');
  const [openGroup, setOpenGroup] = useState(null); // label del grupo abierto (acordeon)
  const [flyoutPos, setFlyoutPos] = useState(null); // { top, left } del flyout en escritorio

  const slim = collapsed && !mobileOpen;

  const toggleCollapsed = () => {
    setOpenGroup(null);
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
      return next;
    });
  };

  // Cierra el flyout al hacer clic fuera o al redimensionar (la posicion fija quedaria desfasada).
  useEffect(() => {
    if (!openGroup) return undefined;
    const onDocClick = (e) => {
      if (asideRef.current?.contains(e.target) || flyoutRef.current?.contains(e.target)) return;
      setOpenGroup(null);
    };
    const onResize = () => setOpenGroup(null);
    document.addEventListener('mousedown', onDocClick);
    window.addEventListener('resize', onResize);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      window.removeEventListener('resize', onResize);
    };
  }, [openGroup]);

  // Cierra menus al cambiar de ruta.
  useEffect(() => { setOpenGroup(null); }, [location.pathname]);

  const handleNavigate = () => { setOpenGroup(null); onClose?.(); };

  const handleGroupClick = (label, e) => {
    if (openGroup === label) { setOpenGroup(null); return; }
    const asideRect = asideRef.current?.getBoundingClientRect();
    const btnRect = e.currentTarget.getBoundingClientRect();
    const top = Math.max(8, Math.min(btnRect.top, window.innerHeight - 240));
    setFlyoutPos({ top, left: (asideRect?.right ?? 0) + 4 });
    setOpenGroup(label);
  };

  const renderChild = ({ to, label, icon: ItemIcon }) => (
    <NavLink key={to} to={to} className={childClass} onClick={handleNavigate}>
      <ItemIcon size={18} className="shrink-0" />
      <span className="truncate">{label}</span>
    </NavLink>
  );

  const groups = NAV
    .map((entry) => {
      if (entry.type === 'item') {
        return hasPermission(entry.permission) ? entry : null;
      }
      const items = entry.items.filter((i) => hasPermission(i.permission));
      return items.length ? { ...entry, items } : null;
    })
    .filter(Boolean);

  const openGroupData = groups.find((g) => g.type === 'group' && g.label === openGroup);

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
            const containsActive = entry.items.some((i) => location.pathname.startsWith(i.to));
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
    </>
  );
}
