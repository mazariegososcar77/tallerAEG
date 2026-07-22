# CLAUDE.md — Frontend Taller AEG

SPA en **React 18 + Vite + Tailwind CSS**. Estado de sesión con Context API, llamadas con Axios y
hooks propios, notificaciones con react-hot-toast.

## Comandos

```bash
npm install
npm run dev      # http://localhost:5173 (proxy /api -> backend :4000)
npm run build    # build de produccion en dist/
npm run preview  # sirve el build
```

Requiere el backend corriendo en `:4000` (ver `../backend`). Login por defecto:
**admin@talleraeg.com / Admin123!**

## Estructura y dónde va cada cosa

| Carpeta | Contenido |
|---------|-----------|
| `src/api/` | Un módulo por recurso. `client.js` es la instancia Axios con interceptores (añade el Bearer, maneja 401). **Toda llamada HTTP pasa por aquí**, nunca `fetch` suelto en componentes. |
| `src/context/` | `AuthContext` (usuario, token en localStorage, `login`/`logout`, `hasPermission`). |
| `src/hooks/` | Hooks de datos (`useUsers`, `useRoles`, `usePermissions`) que encapsulan carga + estados. |
| `src/components/ui/` | Primitivos reutilizables (`Button`, `Input`, `Select`, `Checkbox`, `Modal`, `Table`, …). **Construye la UI con estos**, no repitas marcado/estilos por página. `Select` y `Checkbox` son propios (no usar `<select>`/`<input type="checkbox">` nativos): `Select` usa `onChange(value)` y `Checkbox` usa `onChange(nextChecked)`. |
| `src/components/layout/` | `AppLayout` (sidebar + topbar + `Outlet`), `Sidebar`, `Topbar`. |
| `src/components/auth/` | `LoginForm`, `ImageCarousel` (usados por `LoginPage`). |
| `src/pages/` | Una carpeta/archivo por vista. Las páginas componen hooks + componentes `ui`. |
| `src/routes/` | `AppRoutes` (definición de rutas) y `ProtectedRoute` (guard de auth + permiso). |
| `src/lib/` | Utilidades: `toast.js` (wrapper de react-hot-toast) y `excel.js` (plantilla + parseo `.xlsx`; importa `xlsx` de forma diferida). |

## Patrones a seguir

- **API:** importa desde `src/api/<recurso>Api.js`; esos módulos usan el `client` de Axios. El
  interceptor adjunta el token y, ante un `401`, cierra sesión y redirige a `/login`.
- **Permisos en UI:** usa `hasPermission('users.create')` (de `useAuth`) para mostrar/ocultar
  botones y entradas de menú. Las rutas se protegen con `<ProtectedRoute permission="users.view">`.
- **Notificaciones:** usa `toast.success/error/info` de `src/lib/toast.js` (ya tematizados), no
  `react-hot-toast` directo.
- **Estilos:** solo clases de Tailwind con los tokens de marca `navy` y `orange`
  (`tailwind.config.js`). Animaciones discretas (`animate-fade-in`, `animate-slide-up`).
- **Componentes:** mantén las páginas delgadas; extrae a `components/ui` o `components/common`
  cualquier pieza que se repita (tablas, modales, formularios, cabeceras).

## Módulos

- **Inventario** (`pages/inventory/`): `ArticlesPage` (lista + filtros + carga masiva),
  `ArticleFormPage` (**página completa** en `/inventario/nuevo` y `/inventario/:id/editar`, no modal),
  `BulkUploadModal` (Excel). Imagen vía `components/inventory/ImagePicker` (URL o subida).
- **Clientes** (`pages/clients/`): `ClientsPage` (lista + filtros), `ClientFormModal` (alta/edición con
  NIT/DPI, contacto, tipo y fidelización) y `ClientViewModal` (detalle de solo lectura).
- **Órdenes de trabajo** (`pages/workOrders/`, ruta `/ordenes`): `WorkOrdersPage`, `WorkOrderFormPage`
  (página completa, `/ordenes/nueva` y `/ordenes/:id/editar`) y `WorkOrderViewModal`. **A propósito no
  muestra precios en ningún lado** (form, lista, modal, PDF) — la orden la trabajan técnicos; el precio
  es de Cotizaciones/Facturación (administración). `work_orders.total` se sigue llenando internamente
  (heredado de la cotización de origen), solo no hay UI para verlo/editarlo aquí.
- **Cotizaciones** (`pages/quotes/`, ruta `/cotizaciones`): `QuotesPage` y `QuoteFormPage` (página
  completa, `/cotizaciones/nueva` y `/cotizaciones/:id/editar`).
- **Máquinas y mantenimiento** (`pages/machines/`, `pages/maintenance/`, rutas `/maquinas` y
  `/mantenimientos`): `MachinesPage`, `MaintenancePage`.
- **Reportes de trabajo** (`pages/workReports/`, ruta `/reportes/:id/editar`): `WorkReportFormPage`
  documenta las 4 etapas fijas (antes/desarmado/piezas_nuevas/armado_final) con
  `components/reports/PhotoStageGallery` (galería controlada, sube una foto por llamada a
  `workReportsApi.addPhoto`) + una nota de texto por etapa. No se crea "en blanco": el botón cámara de
  `WorkOrdersPage` llama `workReportsApi.createForOrder(orderId)` (idempotente) y navega ahí. **Para
  finalizar son obligatorios**: foto + nota en las 4 etapas, y ambas firmas — el botón "Finalizar
  Reporte" se deshabilita y se muestra un checklist de lo que falta (`report.missing_requirements`,
  que ya viene calculado del backend); el backend también lo rechaza con 400 si se intenta saltar
  por API directa. "Finalizar Reporte" genera la factura y navega a `/facturacion?invoice=<id>`
  (abre el modal de certificar). Al
  final del formulario, `components/reports/SignaturePad` (canvas propio, sin librería externa, mouse +
  touch) captura la firma de "Técnico que entrega" y "Recibido por" — exporta a PNG con
  `canvas.toBlob` y sube igual que una foto de etapa. Un reporte `finalizado` queda de solo lectura
  para todos salvo quien tenga `work-reports.force-edit` (ver `backend/CLAUDE.md`); en ese caso se
  muestra un aviso y el botón "Guardar Notas" sigue activo, pero "Finalizar Reporte" no vuelve a
  aparecer. `WorkReportsPage` (la lista) tiene los mismos botones ojito/descargar PDF que
  Cotizaciones/Órdenes/Facturación, apuntando a `GET /work-reports/:id/pdf`.
- **Facturación** (`pages/billing/`, ruta `/facturacion`): `InvoicesPage` (filtro por cliente/rango de
  fechas/"solo pendientes", todo client-side sobre `invoicesApi.list()`) + `CertifyInvoiceModal`
  (captura el correo, prellenado con el del cliente; el aviso en el modal deja claro que la
  certificación FEL real y el envío de correo aún no están integrados — ver `backend/CLAUDE.md`).
- **Cotización → Orden:** botón "Crear Orden" en `QuotesPage` (solo si `status==='aprobada'`) navega a
  `/ordenes/nueva?fromQuote=<id>`; `WorkOrderFormPage` lee ese query param, trae la cotización y
  prellena el formulario (si tiene varios equipos, un `Combobox` deja elegir cuál). No hay creación en
  bloque: para varias órdenes desde la misma cotización se repite la acción por cada equipo.
- **Configuración** (`pages/config/`): `ArticleTypesPage`, `WarehousesPage`, `ClientTypesPage` y
  `PartCategoriesPage` envuelven el CRUD reutilizable `components/config/CatalogManager` (catálogos
  `{ name, description, is_active }` por defecto; `withColor` agrega selector de color —lo usa
  Bodegas—, `withPrefix` agrega campo de prefijo y `withDescription={false}` oculta la descripción
  —los usa `PartCategoriesPage` porque `part_categories` no tiene columna `description`, solo
  `name/prefix/is_active`—). `LoyaltyTiersPage` (fidelización: nivel, descuento %, beneficios) es una
  página propia porque no encaja en ese catálogo simple. `GeneralSettingsPage`,
  `SystemParamsPage` y `CatalogsPage` son placeholders (`ComingSoonPage`), sin funcionalidad real aún.
- Las rutas de órdenes/cotizaciones/máquinas/mantenimiento/configuración-placeholder se protegen con
  `permission="dashboard.view"` en `AppRoutes` (no tienen permiso granular propio todavía, a
  diferencia de `articles.view`/`clients.view`/etc.). Reportes y Facturación sí usan permiso granular
  propio (`work-reports.view`/`billing.view`) desde el inicio.
- **Sidebar contraíble:** `Sidebar` guarda `collapsed` en localStorage; el botón "Contraer" (abajo)
  alterna icono-solo. El nav se agrupa por secciones (Configuración / Administración).

## Imágenes

- `public/logo.png` — logo de marca (copia de `Propuesta 2.png`).
- `public/img/carrusel/` — slides del login. Son placeholders de marca; reemplázalos por las
  imágenes definitivas conservando los nombres o ajusta la lista en `ImageCarousel`.
- Imágenes de artículos: se suben al backend y se referencian como `/api/uploads/<archivo>`
  (o una URL externa). El `<img>` resuelve esa ruta vía el proxy de Vite en dev.
