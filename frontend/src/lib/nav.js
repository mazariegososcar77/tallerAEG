import {
  LayoutDashboard, Package, Tags, Warehouse, Users, ShieldCheck, KeyRound,
  Contact, UserCog, Award, ClipboardList, Wrench, Calendar, FileText, Settings,
  Briefcase, Boxes, HeartHandshake, SlidersHorizontal, Cog, ListChecks, Camera,
  Receipt, Layers, Search, Truck,
} from 'lucide-react';

/**
 * Estructura del menu lateral (Sidebar.jsx) Y, a la vez, el "mapa" de que ruta
 * es la principal de cada permiso (lo usa HomeRedirect.jsx para saber a donde
 * mandar a alguien justo despues de iniciar sesion). Vive en su propio archivo
 * (en vez de adentro de Sidebar.jsx) para poder importarse desde ambos lados
 * sin que uno dependa de las internas del otro.
 *
 * Un item suelto (Dashboard) y varios grupos colapsables; un grupo puede tener,
 * dentro de sus `items`, otro grupo anidado (un solo nivel mas, ej.
 * "Operaciones" > "Pre"/"Post"). Cada opcion tiene un `permission`: el
 * componente que la usa revisa los permisos del usuario y solo muestra las
 * opciones (y hasta grupos completos) para las que tiene acceso.
 */
export const NAV = [
  { type: 'item', to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, permission: 'dashboard.view' },
  {
    // Va ANTES que "Operaciones" a proposito: findFirstAccessibleRoute (mas
    // abajo) recorre NAV en orden y se queda con el primer permiso que
    // encuentra -- como "Reportes de Trabajo" tambien aparece dentro de
    // Operaciones > Pre/Post (mismo permiso work-reports.view, reusado ahi
    // por conveniencia), si este grupo fuera despues, un rol restringido solo
    // a estos dos permisos aterrizaria en /reportes en vez de en /ordenes-servicio.
    type: 'group', label: 'Servicio Técnico', icon: Truck,
    items: [
      { to: '/ordenes-servicio', label: 'Orden de Servicio',   icon: Truck,  permission: 'service-orders.view' },
      { to: '/reportes',         label: 'Reportes de Trabajo', icon: Camera, permission: 'work-reports.view' },
    ],
  },
  {
    type: 'group', label: 'Operaciones', icon: Briefcase,
    items: [
      { to: '/clientes', label: 'Clientes', icon: Contact, permission: 'clients.view' },
      {
        type: 'group', label: 'Pre', icon: Layers,
        items: [
          { to: '/cotizaciones',  label: 'Cotizaciones',        icon: FileText,      permission: 'dashboard.view' },
          { to: '/ordenes',       label: 'Ordenes de Trabajo',  icon: ClipboardList, permission: 'dashboard.view' },
          { to: '/reportes',      label: 'Reportes de Trabajo', icon: Camera,        permission: 'work-reports.view' },
          { to: '/facturacion',   label: 'Facturación',         icon: Receipt,       permission: 'billing.view' },
        ],
      },
      {
        // Orden a proposito distinto de "Pre": aqui la orden se abre primero
        // (sin cotizacion previa) y la cotizacion se arma hasta despues del
        // reporte de trabajo, cuando ya se conoce el diagnostico real.
        type: 'group', label: 'Post', icon: Search,
        items: [
          { to: '/post/ordenes',      label: 'Ordenes de Trabajo',  icon: ClipboardList, permission: 'dashboard.view' },
          { to: '/post/reportes',     label: 'Reportes de Trabajo', icon: Camera,        permission: 'work-reports.view' },
          { to: '/post/cotizaciones', label: 'Cotizaciones',        icon: FileText,      permission: 'dashboard.view' },
          { to: '/post/facturacion',  label: 'Facturación',         icon: Receipt,       permission: 'billing.view' },
        ],
      },
    ],
  },
  {
    type: 'group', label: 'Inventario', icon: Package,
    items: [
      { to: '/inventario',            label: 'Inventario',        icon: Boxes,     permission: 'articles.view' },
      { to: '/configuracion/bodegas', label: 'Bodegas',           icon: Warehouse, permission: 'warehouses.view' },
      { to: '/configuracion/tipos',   label: 'Tipos de articulo', icon: Tags,      permission: 'article-types.view' },
      { to: '/configuracion/categorias-pieza', label: 'Categorias de Pieza', icon: ListChecks, permission: 'part-categories.view' },
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
      { to: '/configuracion/general',    label: 'Configuracion general', icon: SlidersHorizontal, permission: 'settings.view' },
      { to: '/configuracion/parametros', label: 'Parametros del sistema', icon: Cog,              permission: 'dashboard.view' },
      { to: '/configuracion/catalogos',  label: 'Catalogos',             icon: ListChecks,        permission: 'dashboard.view' },
    ],
  },
];

/**
 * Recorre NAV en orden (entrando en los grupos y subgrupos anidados) y
 * devuelve la ruta del PRIMER item para el que el usuario tiene permiso.
 * null si no tiene acceso a nada. La usa HomeRedirect.jsx para saber a donde
 * mandar a alguien justo despues de iniciar sesion, en vez de mandar a todos
 * fijo a /dashboard (eso rompia el rol Subcontrato: sin dashboard.view,
 * aterrizaba en un "No autorizado" en vez de en su propio modulo).
 */
export function findFirstAccessibleRoute(hasPermission) {
  const search = (items) => {
    for (const item of items) {
      if (item.type === 'group') {
        const found = search(item.items);
        if (found) return found;
      } else if (hasPermission(item.permission)) {
        return item.to;
      }
    }
    return null;
  };
  return search(NAV);
}
