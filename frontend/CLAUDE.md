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
| `src/context/` | `AuthContext` (usuario, token en localStorage, `login`/`logout`, `hasPermission`), `ThemeContext` (claro/oscuro) y `SettingsContext` (configuración del sistema). |
| `src/hooks/` | Hooks de datos (`useUsers`, `useRoles`, `usePermissions`) que encapsulan carga + estados. |
| `src/components/ui/` | Primitivos reutilizables (`Button`, `Input`, `Select`, `Checkbox`, `Modal`, `Table`, …). **Construye la UI con estos**, no repitas marcado/estilos por página. `Select` y `Checkbox` son propios (no usar `<select>`/`<input type="checkbox">` nativos): `Select` usa `onChange(value)` y `Checkbox` usa `onChange(nextChecked)`. |
| `src/components/layout/` | `AppLayout` (sidebar + topbar + `Outlet`), `Sidebar`, `Topbar`. |
| `src/components/auth/` | `LoginForm`, `ImageCarousel` (usados por `LoginPage`). |
| `src/pages/` | Una carpeta/archivo por vista. Las páginas componen hooks + componentes `ui`. |
| `src/routes/` | `AppRoutes` (definición de rutas) y `ProtectedRoute` (guard de auth + permiso). |
| `src/lib/` | Utilidades: `toast.js` (wrapper de react-hot-toast), `excel.js` (plantilla + parseo `.xlsx`; importa `xlsx` de forma diferida), `pdf.js` (descarga de PDF protegidos) e `image.js` (normaliza las imágenes antes de subirlas). |

## Patrones a seguir

- **API:** importa desde `src/api/<recurso>Api.js`; esos módulos usan el `client` de Axios. El
  interceptor adjunta el token y, ante un `401`, cierra sesión y redirige a `/login`.
- **Permisos en UI:** usa `hasPermission('users.create')` (de `useAuth`) para mostrar/ocultar
  botones y entradas de menú. Las rutas se protegen con `<ProtectedRoute permission="users.view">`.
- **Notificaciones:** usa `notify.success/error/info` de `src/lib/toast.js` (ya tematizados), no
  `react-hot-toast` directo. **Nunca uses `alert()`, `confirm()` ni `prompt()` del navegador**: los
  avisos van por `notify` y las confirmaciones por `components/ui/ConfirmDialog` (patrón: un estado
  `toDelete` con el registro pendiente + `<ConfirmDialog open={toDelete != null} …>`).
- **PDF:** todos los PDF los genera el backend en endpoints protegidos, así que se piden con el token
  y se manejan como blob — nunca con un `<a href>` directo. Usa `downloadPdf(url, fileName)` de
  `src/lib/pdf.js` para descargar y `components/ui/PdfViewerModal` para **visualizar dentro de la
  app** (`url` + `fileName` + `title`; el propio modal hace el fetch, muestra spinner/error y trae su
  botón de descarga). **No abras PDF en otra pestaña** (`window.open`) — la única excepción es el
  botón de escape que `PdfViewerModal` muestra solo en móvil, para los navegadores de celular que no
  saben dibujar un PDF embebido.
- **Subir archivos:** ya **no** viajan al backend — van directo a Google Cloud Storage.
  1. Prepara la imagen con `prepareImageForUpload(file, formato)` de `src/lib/image.js` (la redibuja
     ≤1800px con canvas) y usa `IMAGE_ACCEPT` en el `accept` del `<input type="file">`. Esto es lo que
     permite aceptar cualquier formato que el navegador sepa leer (HEIC de iPhone, WEBP, BMP, TIFF…).
     **`'webp'` solo para la imagen de artículo**; las fotos de reporte van en `'jpg'` (el default)
     porque se imprimen en el PDF y `pdfkit` solo sabe embeber JPEG/PNG.
  2. Súbelo con `subirArchivo()` de `src/lib/upload.js`, que pide la URL firmada y hace el PUT con
     `XMLHttpRequest` — **no** con el cliente Axios, porque su interceptor pega `Authorization` y Google
     rechaza una URL firmada que además traiga esa cabecera. Devuelve la ruta del objeto, o `null` si el
     sistema todavía guarda en el disco del servidor (y ahí se usa el multipart de siempre). Los módulos
     de `src/api/` ya encapsulan los dos caminos: llama `articlesApi.uploadImage(file, onProgress)`,
     `workReportsApi.addPhoto(id, file, { stage, onProgress })`, etc.
  3. Muestra el avance: `onProgress` recibe 0–100. Con la señal de un taller una foto tarda varios
     segundos y sin ese aviso parece que la app se colgó.
  En móvil, ofrece cámara (`capture="environment"`) y galería como dos entradas distintas, igual que
  `components/reports/PhotoStageGallery`.
- **Mostrar imágenes:** lo que devuelve la API en los campos de media ya es una URL firmada temporal
  (vence en 1 hora), así que se usa como `src` directo. **Excepción importante:** en artículos el campo
  `image_url` es el valor **guardado** (una ruta interna) y `image_display_url` es la dirección para
  mostrar. El formulario reenvía `image_url` al guardar; si ahí llegara la URL firmada, se escribiría en
  la base y la imagen se rompería al vencer.
- **Estilos:** solo clases de Tailwind con los tokens de marca `navy` y `orange`
  (`tailwind.config.js`). Animaciones discretas (`animate-fade-in`, `animate-slide-up`).
- **Colores de marca configurables:** las escalas `navy`/`orange` de `tailwind.config.js` resuelven a
  variables CSS con **canales RGB sueltos** (`rgb(var(--c-navy-700) / <alpha-value>)`), definidas en
  `src/index.css`. Ese formato es a propósito: es lo que mantiene vivas las transparencias tipo
  `bg-navy-900/50`. Si agregas un tono nuevo, respétalo. `src/lib/palette.js` calcula los 10 tonos a
  partir del color elegido en Configuración general y los escribe en `documentElement`; con los
  colores de marca no escribe nada y deja los tonos afinados a mano de `index.css`. Para estilos en
  línea hay `var(--c-primary)` / `var(--c-accent)` (los mismos dos colores en hex).
  **Cuidado:** varias páginas con estilos en línea guardan el acento en un objeto de módulo
  (`const C = { orange:'#CA8A04' }`) y lo concatenan con transparencia (`C.orange+'22'`). Eso **no**
  se puede cambiar por `var(...)` sin romperlo, así que esos acentos siguen fijos; los colores de
  estado (azul/ámbar/rojo/verde) tampoco se tocan a propósito, porque significan algo.
- **Tablas de listado:** usa `components/ui/Table` (celdas de tabla reales, scroll horizontal y
  columna de acciones de ancho automático). **No** armes tablas con `display:grid` y columnas de
  ancho fijo: fue justo lo que hizo que en Clientes los botones de acción se montaran sobre la
  columna "Estado". En celular, tarjetas con los datos arriba y los botones en su propia fila.
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
  `workReportsApi.addPhoto`; en celular muestra "Tomar foto" —abre la cámara— y "Galería" por
  separado, en escritorio un solo botón de archivos) + una nota de texto por etapa. No se crea "en blanco": el botón cámara de
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
  aparecer. `WorkReportsPage` (la lista) tiene los mismos botones visualizar/descargar PDF que
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
  página propia porque no encaja en ese catálogo simple. Las pantallas placeholder
  `SystemParamsPage` y `CatalogsPage` se eliminaron junto con sus entradas de menú y sus rutas;
  `ComingSoonPage` sigue existiendo porque la usa la ruta `post/cotizaciones`.
- **Notificaciones** (`pages/config/NotificationsPage`, ruta `/configuracion/notificaciones`, mismos
  permisos `settings.view`/`settings.update`): qué se avisa por correo y a quién. Los ajustes son de
  `system_settings` como los de Configuración general, así que usa el **mismo `useSettings`** — no
  tiene API propia para guardar. `api/notificationsApi.js` solo cubre lo que no es configuración: el
  historial de envíos, el aviso de prueba y el botón "Revisar ahora". Los cuatro avisos se declaran
  como **datos** en la constante `AVISOS`, no como cuatro bloques de JSX repetidos: agregar uno es
  una entrada ahí más su clave en `SETTINGS_SCHEMA` del backend. La pantalla distingue los avisos
  **Diarios** (los revisa el sistema a la hora configurada) de los **Inmediatos** (salen al ocurrir),
  y avisa cuando algo no va a poder enviarse: un aviso activo sin destinatario, o avisos activos sin
  URL de webhook. El botón "Enviar prueba" se deshabilita si la URL está editada y sin guardar,
  porque la prueba usa la guardada.
- **Configuración general** (`pages/config/GeneralSettingsPage`, ruta `/configuracion/general`,
  permiso `settings.view` para verla y `settings.update` para guardar): tema por defecto, colores de
  marca, datos del taller y vigencia de cotizaciones. La carga y aplica `context/SettingsContext`
  (hook `useSettings`), que se monta dentro de `AuthProvider` (necesita sesión) y de `ThemeProvider`
  (le pasa el tema por defecto). Al elegir un color se ve el cambio en vivo (`previewColors`) sin
  guardar, y al salir de la pantalla se restauran los colores guardados.
  **Tema:** lo que el usuario elige con el botón sol/luna se guarda en su navegador y **siempre
  manda**; el ajuste del sistema solo aplica a quien nunca eligió (`ThemeContext.applyDefaultTheme`,
  y `resetToSystemDefault` para volver a lo que diga el sistema). Por eso `ThemeContext` ya **no**
  persiste el tema en cada cambio — solo cuando el usuario lo cambia a mano.
- Las rutas de órdenes/cotizaciones/máquinas/mantenimiento se protegen con
  `permission="dashboard.view"` en `AppRoutes` (no tienen permiso granular propio todavía, a
  diferencia de `articles.view`/`clients.view`/etc.). Reportes y Facturación sí usan permiso granular
  propio (`work-reports.view`/`billing.view`) desde el inicio.
- **Sidebar contraíble:** `Sidebar` guarda `collapsed` en localStorage; el botón "Contraer" (abajo)
  alterna icono-solo. El nav se agrupa por secciones (Configuración / Administración).

## Imágenes

- **Logo:** hay dos archivos y se usan en lugares distintos a propósito.
  - `public/logo.png` — **solo el emblema** (el rodamiento), cuadrado y con fondo transparente. Lo
    usa la barra lateral (`Sidebar`, 44×44 px) y es el favicon. No lleva el pie "Desde el año 2000"
    porque a ese tamaño el texto sería una mancha de 2 px.
  - `public/logo-full.png` — el **logo completo, con el pie**, para el login (`LoginForm`, `h-32
    w-auto`), donde sí hay espacio para leerlo. Va con `w-auto`: no es cuadrado y un ancho fijo lo
    deformaría.
  - Los dos salen de `logo-nuevo.jpeg` (en la raíz del repo, junto a `Propuesta 1/2.png`) recortando
    el marco y el blanco sobrante. El fondo se vuelve transparente con un **relleno desde los
    bordes**, no marcando "todo lo casi blanco": el emblema tiene blanco por dentro (el disco de las
    letras A.E.G.) y por color quedaría agujereado.
  - En el sidebar el logo conserva su recuadro blanco (`rounded-lg bg-white p-1`). Es a propósito: el
    aro exterior del emblema es azul casi negro y sobre el verde oscuro del menú se perdería.
  - El membrete de los PDF usa **otro archivo**, `backend/src/assets/logo.jpeg` (el logo completo
    sobre blanco), porque `pdfkit` solo embebe JPEG/PNG opacos.
- `public/img/carrusel/` — slides del login. Son placeholders de marca; reemplázalos por las
  imágenes definitivas conservando los nombres o ajusta la lista en `ImageCarousel`.
- Imágenes de artículos: se suben directo a Google Cloud Storage y se guardan como la ruta del objeto
  (o una URL externa). Para mostrarlas se usa `image_display_url`, que el backend firma al vuelo. Los
  archivos subidos **antes** de la migración siguen siendo `/uploads/<archivo>` y se resuelven vía el
  proxy de Vite en dev — el backend sabe servir los dos formatos.
- **Todo lo que se sube pasa por `lib/image.js`** (`prepareImageForUpload`): el navegador redibuja la
  imagen en un `<canvas>` y la reexporta ≤1800px / calidad 0.85, en JPG o WebP según el destino (ver
  "Subir archivos" arriba). Así se acepta cualquier formato que el navegador sepa decodificar (HEIC del
  iPhone incluido) y el archivo llega liviano. Si el navegador no puede leerlo, se sube el original tal
  cual y decide el backend. Los PNG de ≤1 MB (las firmas) se dejan intactos para no perder la
  transparencia.
