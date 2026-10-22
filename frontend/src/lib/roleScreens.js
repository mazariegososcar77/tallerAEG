// Catalogo de "pantallas" para el Modo simple de asignacion de permisos (ver RoleFormModal).
//
// El catalogo de permisos de la base tiene ~78 filas granulares (ver permisos) agrupadas por
// una columna "module" que mezcla varias pantallas distintas bajo el mismo grupo (ej. "Tipos
// de articulo", "Bodegas", "Categorias de pieza" y "Configuracion general" caen todas en
// module='Configuracion'). Eso es justo lo que hacia dificil armar un rol a mano: habia que
// revisar 78 casillas una por una para saber cuales corresponden a cada pantalla real.
//
// Este archivo agrupa esos mismos permisos por PANTALLA (lo que el usuario ve en el menu,
// igual que nav.js) en paquetes "seguros": activar una pantalla marca sus permisos normales
// de ver/crear/editar/eliminar, pero NUNCA incluye un permiso sensible/reservado a
// Administrador (certificar o anular una factura, reabrir un reporte finalizado, reiniciar
// una cotizacion a Borrador, borrar un documento adjunto de una orden) -- esos solo se tocan
// en Modo avanzado (la vista granular de siempre, sin cambios).
//
// Activar/desactivar una pantalla SOLO agrega o quita los permission ids de su propio
// paquete -- nunca toca permisos de otra pantalla ni los sensibles de arriba -- asi que ir y
// venir entre Modo simple y Modo avanzado nunca pierde nada que ya estuviera marcado.
export const SCREEN_GROUPS = [
  {
    label: 'Administracion',
    screens: [
      { key: 'users',       label: 'Usuarios', codes: ['users.view', 'users.create', 'users.update', 'users.delete'] },
      { key: 'roles',       label: 'Roles',    codes: ['roles.view', 'roles.create', 'roles.update', 'roles.delete'] },
      { key: 'permissions', label: 'Permisos', codes: ['permissions.view'] },
    ],
  },
  {
    label: 'Operaciones',
    screens: [
      { key: 'quotes', label: 'Cotizaciones (ver)', codes: ['quotes.view'] },
      {
        key: 'work-orders', label: 'Ordenes de Trabajo (ver, cambiar estado, crear)',
        description: 'Crear deja el flujo Post (siempre) y el flujo Pre solo a partir de una cotización ya aprobada.',
        codes: ['work-orders.view', 'work-orders.update-status', 'work-orders.create'],
      },
      {
        key: 'work-order-documents', label: 'Documentos adjuntos de una Orden (ver y subir)',
        codes: ['work-order-documents.view', 'work-order-documents.manage'],
      },
      {
        key: 'operations-full', label: 'Operaciones — acceso completo (administrativo)',
        description: 'Crear, editar y eliminar Ordenes de Trabajo y Cotizaciones; gestionar Maquinas y Mantenimiento; ver el Panel principal. Es UN SOLO permiso compartido por todo esto ("dashboard.view") — hoy no se puede dar solo para una de estas pantallas, por eso va aparte del resto.',
        codes: ['dashboard.view'],
      },
      {
        key: 'clients', label: 'Clientes',
        codes: ['clients.view', 'clients.create', 'clients.update', 'clients.delete', 'clients.quick-create', 'clients.validate'],
      },
      {
        key: 'clients-history', label: 'Historial de un cliente (sin ver la lista completa)',
        description: 'Deja ver el "expediente" (maquinas y trabajos realizados) de un cliente puntual, sin dar acceso a la lista completa de Clientes.',
        codes: ['clients.history.view'],
      },
      { key: 'machines', label: 'Maquinas (solo ver, para elegirla en un formulario)', codes: ['machines.view'] },
      {
        key: 'work-reports', label: 'Reportes de Trabajo',
        codes: ['work-reports.view', 'work-reports.create', 'work-reports.update', 'work-reports.delete', 'work-report-items.manage'],
      },
      { key: 'billing', label: 'Facturacion (ver, generar)', codes: ['billing.view', 'billing.create'] },
      {
        key: 'service-orders', label: 'Ordenes de Servicio',
        codes: ['service-orders.view', 'service-orders.create', 'service-orders.update', 'service-orders.delete'],
      },
    ],
  },
  {
    label: 'Inventario',
    screens: [
      { key: 'articles', label: 'Inventario (articulos)', codes: ['articles.view', 'articles.create', 'articles.update', 'articles.delete'] },
      { key: 'inventory-movements', label: 'Movimientos de inventario (Kardex)', codes: ['inventory-movements.view', 'inventory-movements.create'] },
      { key: 'warehouses', label: 'Bodegas', codes: ['warehouses.view', 'warehouses.create', 'warehouses.update', 'warehouses.delete'] },
      { key: 'article-types', label: 'Tipos de articulo', codes: ['article-types.view', 'article-types.create', 'article-types.update', 'article-types.delete'] },
      { key: 'part-categories', label: 'Categorias de pieza', codes: ['part-categories.view', 'part-categories.create', 'part-categories.update', 'part-categories.delete'] },
    ],
  },
  {
    label: 'CRM',
    screens: [
      { key: 'client-types', label: 'Tipos de cliente', codes: ['client-types.view', 'client-types.create', 'client-types.update', 'client-types.delete'] },
      { key: 'loyalty', label: 'Fidelizacion', codes: ['loyalty.view', 'loyalty.create', 'loyalty.update', 'loyalty.delete'] },
    ],
  },
  {
    label: 'Configuracion',
    screens: [
      { key: 'work-types', label: 'Tipos de trabajo', codes: ['work-types.view', 'work-types.create', 'work-types.update', 'work-types.delete'] },
      { key: 'equipment-types', label: 'Tipos de equipo', codes: ['equipment-types.view', 'equipment-types.create', 'equipment-types.update', 'equipment-types.delete'] },
      { key: 'settings', label: 'Configuracion general y Notificaciones', codes: ['settings.view', 'settings.update'] },
      { key: 'document-series', label: 'Numeracion de documentos', codes: ['document-series.view', 'document-series.update'] },
    ],
  },
];

// Todos los codigos que SI estan cubiertos por alguna pantalla del Modo simple -- sirve para
// decidir si el conjunto de permisos actual de un rol se puede representar fielmente en Modo
// simple (ver RoleFormModal: si tiene marcado algo que no esta aqui, como un permiso sensible
// reservado a Administrador, se abre en Modo avanzado para no esconderlo).
export const SIMPLE_MODE_CODES = new Set(
  SCREEN_GROUPS.flatMap((g) => g.screens.flatMap((s) => s.codes)),
);

// ¿El conjunto de permisos ya marcados de un rol se puede mostrar fielmente en Modo simple?
// No, si tiene algun permiso sensible/fuera del catalogo de pantallas, o si el paquete de
// alguna pantalla esta solo A MEDIAS marcado (eso se veria como "apagado" en una sola casilla,
// y activarla/desactivarla de un clic perderia esa combinacion fina que alguien arm en Modo
// avanzado). `codeById` es el mapa id -> code del catalogo de permisos que llega del backend.
export function fitsSimpleMode(selectedIds, codeById) {
  const selectedCodes = new Set([...selectedIds].map((id) => codeById[id]).filter(Boolean));
  for (const code of selectedCodes) {
    if (!SIMPLE_MODE_CODES.has(code)) return false;
  }
  for (const group of SCREEN_GROUPS) {
    for (const screen of group.screens) {
      const count = screen.codes.filter((c) => selectedCodes.has(c)).length;
      if (count > 0 && count < screen.codes.length) return false;
    }
  }
  return true;
}
