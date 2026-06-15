import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Package, Tags, Warehouse, Users,
  ShieldCheck, KeyRound, Contact, UserCog, Award,
  ChevronsLeft, ChevronsRight, ChevronDown, ClipboardList, Wrench, Calendar, FileText, Settings,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth.js';

const STORAGE_KEY = 'taller_aeg_sidebar_collapsed';

// Items sueltos en la parte superior del menu.
const MAIN_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, permission: 'dashboard.view' },
  { to: '/clientes', label: 'Clientes', icon: Contact, permission: 'clients.view' },
  { to: '/inventario', label: 'Inventario', icon: Package, permission: 'articles.view' },
  { to: '/ordenes', label: 'Ordenes de Trabajo', icon: ClipboardList, permission: 'dashboard.view' },
  { to: '/cotizaciones', label: 'Cotizaciones', icon: FileText, permission: 'dashboard.view' },
  { to: '/maquinas', label: 'Maquinas', icon: Wrench, permission: 'dashboard.view' },
  { to: '/mantenimientos', label: 'Mantenimientos', icon: Calendar, permission: 'dashboard.view' },
];

// Submenus colapsables.
const SUBMENUS = [
  {
    label: 'Configuracion',
    icon: Settings,
    items: [
      { to: '/configuracion/tipos', label: 'Tipos de articulo', icon: Tags, permission: 'article-types.view' },
      { to: '/configuracion/bodegas', label: 'Bodegas', icon: Warehouse, permission: 'warehouses.view' },
      { to: '/configuracion/tipos-cliente', label: 'Tipos de cliente', icon: UserCog, permission: 'client-types.view' },
      { to: '/configuracion/fidelizacion', label: 'Fidelizacion', icon: Award, permission: 'loyalty.view' },
    ],
  },
  {
    label: 'Administracion',
    icon: ShieldCheck,
    items: [
      { to: '/usuarios', label: 'Usuarios', icon: Users, permission: 'users.view' },
      { to: '/roles', label: 'Roles', icon: ShieldCheck, permission: 'roles.view' },
      { to: '/permisos', label: 'Permisos', icon: KeyRound, permission: 'permissions.view' },
    ],
  },
];

const linkBase = (slim) =>
  ({ isActive }) =>
    'flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ' +
    (slim ? 'justify-center ' : 'gap-3 ') +
    (isActive ? 'bg-orange-500 text-white' : 'text-navy-100 hover:bg-navy-600');

/** Grupo colapsable (submenu). En modo slim muestra los iconos hijos planos. */
function Submenu({ menu, slim, onClose, hasPermission }) {
  const location = useLocation();
  const items = menu.items.filter((i) => hasPermission(i.permission));
  const containsActive = items.some((i) => location.pathname.startsWith(i.to));
  const [open, setOpen] = useState(containsActive);

  if (items.length === 0) return null;

  if (slim) {
    return (
      <>
        <div className="my-2 border-t border-navy-600" />
        {items.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} title={label} className={linkBase(true)} onClick={onClose}>
            <Icon size={20} className="shrink-0" />
          </NavLink>
        ))}
      </>
    );
  }

  const Icon = menu.icon;
  return (
    <div className="pt-1">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={
          'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ' +
          (containsActive ? 'text-white' : 'text-navy-100 hover:bg-navy-600')
        }
        aria-expanded={open}
      >
        <Icon size={20} className="shrink-0" />
        <span className="flex-1 truncate text-left">{menu.label}</span>
        <ChevronDown size={16} className={'shrink-0 transition-transform ' + (open ? 'rotate-180' : '')} />
      </button>
      {open && (
        <div className="ml-4 mt-1 space-y-1 border-l border-navy-600 pl-3">
          {items.map(({ to, label, icon: ItemIcon }) => (
            <NavLink key={to} to={to} className={linkBase(false)} onClick={onClose}>
              <ItemIcon size={18} className="shrink-0" />
              <span className="truncate">{label}</span>
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Sidebar({ mobileOpen, onClose }) {
  const { hasPermission } = useAuth();
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(STORAGE_KEY) === '1');

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
      return next;
    });
  };

  const slim = collapsed && !mobileOpen;
  const mainItems = MAIN_ITEMS.filter((i) => hasPermission(i.permission));

  return (
    <>
      {mobileOpen && (
        <div className="fixed inset-0 z-30 bg-navy-900/50 lg:hidden" onClick={onClose} />
      )}
      <aside className={'fixed inset-y-0 left-0 z-40 flex transform flex-col bg-navy-700 transition-all duration-200 lg:static lg:translate-x-0 ' + (slim ? 'w-20' : 'w-64') + ' ' + (mobileOpen ? 'translate-x-0' : '-translate-x-full')}>
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
          {mainItems.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} title={slim ? label : undefined} className={linkBase(slim)} onClick={onClose}>
              <Icon size={20} className="shrink-0" />
              {!slim && <span className="truncate">{label}</span>}
            </NavLink>
          ))}
          {SUBMENUS.map((menu) => (
            <Submenu
              key={menu.label}
              menu={menu}
              slim={slim}
              onClose={onClose}
              hasPermission={hasPermission}
            />
          ))}
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
    </>
  );
}
