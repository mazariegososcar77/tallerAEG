# CLAUDE.md — Backend Taller AEG

API REST en **Node.js + Express (ESM)**. Autenticación JWT, control de acceso por permisos (RBAC) y
documentación Swagger. Persistencia en **MySQL** (ver "Base de datos" abajo — no en JSON).

## Comandos

```bash
npm install
npm run dev    # nodemon (recarga al guardar)
npm start      # produccion
npm run seed   # LEGACY: solo escribe src/data/*.json; nada lo lee. No inicializa la base MySQL.
```

- Servidor: `http://localhost:4000`
- Documentación Swagger UI: `http://localhost:4000/api/docs`
- Healthcheck: `GET http://localhost:4000/api/health`
- Admin por defecto: **admin@talleraeg.com / Admin123!** (creado por `migraciones/002_seed.sql`)

## Base de datos

Todos los repositorios usan el pool de `mysql2` en [src/lib/db.js](src/lib/db.js) (`DB_HOST`,
`DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`; defaults en ese archivo — **no** están en
`.env.example` todavía). No hay migrador automático: crea la base y aplica los scripts de
`migraciones/` en orden numérico (ver [migraciones/README.md](migraciones/README.md)) antes de
`npm run dev`. `src/lib/jsonStore.js` y `src/data/*.json` solo los usa `npm run seed`, que quedó de
antes de la migración a MySQL — no lo confundas con la inicialización real de datos.

## Arquitectura por capas

El flujo de una petición es **route → middleware → controller → service → repository → MySQL**.
Cada capa tiene una sola responsabilidad:

| Capa | Carpeta | Responsabilidad |
|------|---------|-----------------|
| Rutas | `src/routes/` | Definen endpoints, aplican middleware y llevan los comentarios JSDoc de Swagger. |
| Controladores | `src/controllers/` | Finos: leen `req`, llaman al service, responden. Sin lógica de negocio. |
| Servicios | `src/services/` | Lógica de negocio y reglas (hash de password, validar email único, etc.). |
| Repositorios | `src/repositories/` | Único punto que conoce el origen de datos; hacen `pool.query(...)` sobre `src/lib/db.js`. |

**Regla clave (ya aplicada):** el único punto que conoce el origen de datos es el repositorio — la
migración de JSON a MySQL ya se hizo reescribiendo solo esa capa, sin tocar servicios ni
controladores. Si el modelo de datos cambia, sigue esa misma regla.

## Cómo agregar un endpoint nuevo

1. Si toca datos nuevos, agrégalos primero en `src/repositories/` (y a la migración SQL, ver abajo).
2. Lógica de negocio en el `service` correspondiente.
3. Handler delgado en el `controller`.
4. Registra la ruta en `src/routes/<recurso>Routes.js`, aplica `authenticate` y
   `requirePermission('<code>')` según corresponda, y añade el bloque JSDoc `@openapi` para Swagger.
5. Validación de body con un esquema **zod** pasado a `validate(schema)`.

## Auth y RBAC

- `POST /api/auth/login` valida con **bcryptjs** y emite un JWT con `{ sub, roleId, permissions[] }`
  (el array `permissions` del payload ya no se usa para autorizar — ver el punto siguiente).
- `auth.middleware.js` → `authenticate`: exige `Authorization: Bearer <token>`, verifica la firma, y
  **consulta en la base de datos** el usuario (`is_active`) y los permisos de su rol actual
  (`permissionRepository.findByRoleId`) en cada petición — no confía en la copia del JWT. Esto es a
  propósito: un cambio de permisos de un rol (o desactivar un usuario) tiene efecto inmediato, sin
  esperar a que esa sesión vuelva a iniciar sesión. Costo: una consulta extra por request autenticado.
- `rbac.middleware.js` → `requirePermission('users.create')`: 403 si el usuario no tiene el permiso.
- Errores: lanza `new ApiError(status, mensaje)`; `error.middleware.js` los formatea como
  `{ error, details? }`.

## Migraciones SQL (`migraciones/`)

Esquema MySQL real como scripts incrementales y numerados (`001_init.sql` … `020_reports_billing_seed.sql`),
que hay que aplicar a mano en orden (no hay migrador automático — ver "Base de datos" arriba).
Convención documentada en [migraciones/README.md](migraciones/README.md) (ese README todavía dice
"mientras el backend usa JSON" — está desactualizado, ignóralo en ese punto).
**Al cambiar el modelo de datos, crea un nuevo script numerado** (nunca edites uno ya aplicado).

## Modelo de datos

Módulo 1 (auth/RBAC):
- **users**: `id, name, email, password_hash, role_id, is_active, created_at, updated_at`
- **roles**: `id, name, description, is_active, created_at, updated_at`
- **permissions**: `id, code, description, module`
- **role_permissions**: `role_id, permission_id` (N:M)

Módulo 2 (inventario):
- **warehouses**: `id, name, description, is_active, ...`
- **article_types**: `id, name, description, is_active, ...`
- **articles**: `id, code, name, type_id, warehouse_id, quantity, unit, price, brand, model, location,
  description, image_url, is_active, ...`
- **article_pieces**: `id, article_id, name, created_at, updated_at` (piezas/items que componen un
  artículo; N por artículo). Se sincronizan con `articlePieceRepository.replaceForArticle` cuando el
  payload de crear/actualizar trae `pieces: string[]`; al borrar el artículo se eliminan en cascada.
- **article_labor**: igual que `article_pieces` pero para la mano de obra del artículo (payload
  `labor: string[]`, `articleLaborRepository`).

Módulo 4 (órdenes de trabajo, `011_work_orders.sql`):
- **work_orders**: cabecera con datos del equipo (`brand, model, serial, kw, voltage, amperage, rpm,
  hp, frame`), tipo de trabajo, técnicos, referencias (`quotation_number, dte_number, oc_number`) y
  `status` (enum `recibido/en_proceso/listo/entregado/cancelado`).
- **work_order_items**: piezas/ítems de la orden (`name, quantity, has_item, notes`), N por orden.

Módulo 5 (máquinas y mantenimiento, `012_machines_maintenance.sql`):
- **machines**: equipo propiedad de un cliente (`client_id, name, brand, model, serial, kw, voltage,
  amperage, rpm, hp, location, notes, is_active`).
- **maintenance_schedules**: calendario por máquina (`frequency` enum + `frequency_days`,
  `last_service`, `next_service`, `status` enum `al_dia/proximo/vencido`).

Módulo 6 (cotizaciones, `015_quotes.sql` + `016_part_categories.sql`): **quotes** (`client_id, date,
valid_until, status, work_type, equipment_data` JSON con N equipos, `discount/subtotal/total`) +
**quote_items** (`equipment_index, item_type` enum `labor/part`, `description, quantity, unit_price,
subtotal`) + **part_categories** (catálogo `name, prefix, is_active`).

`work_orders.quote_id` (`017_work_orders_quote_link.sql`, FK a `quotes`, `ON DELETE SET NULL`) vincula
una orden con la cotización de la que nace. Una cotización con varios equipos genera **una orden por
equipo** (se repite "Crear Orden" desde el frontend); no hay creación masiva.

Módulo 7 (reportes de trabajo, `018_work_reports.sql`):
- **work_reports**: 1 por orden (`UNIQUE work_order_id`), `status` enum `en_progreso/finalizado`,
  `general_notes`, `stage_notes` (JSON `{antes,desarmado,piezas_nuevas,armado_final: string}`,
  serializado/parseado en `workReportRepository`, igual que `quotes.equipment_data`).
- **work_report_photos**: N por reporte, `stage` enum fijo (`antes/desarmado/piezas_nuevas/armado_final`),
  `photo_url, caption, sort_order`. Se suben de a una foto por llamada (`uploadReportPhoto` en
  `upload.middleware.js`, mismo patrón que `articles/upload-image` pero campo `photo`).
- `POST /work-reports/:id/finalize` pone `status='finalizado'` y crea la factura vía
  `invoiceService.createFromWorkReport` (idempotente).
- **Requisitos obligatorios para finalizar:** las 4 etapas deben tener al menos 1 foto y una nota no
  vacía, y ambas firmas (`tech_signature_url`/`client_signature_url`) deben existir —
  `workReportService.getMissingRequirements` calcula la lista; si no está vacía, `finalize` responde
  `400` con el detalle ("Faltan datos obligatorios para finalizar: ..."). `getById` expone esa misma
  lista como `missing_requirements` en la respuesta (vacía si ya está finalizado) para que el frontend
  pinte el checklist sin duplicar la regla.

Módulo 8 (facturación, `019_invoices.sql`):
- **invoices**: 1 por orden (`UNIQUE work_order_id`), FKs a `work_orders`/`work_reports`/`quotes`/`clients`,
  `status` enum `pendiente_certificacion/certificada/anulada`, `client_email`, y campos `fel_*`
  (`fel_certifier, fel_uuid, fel_series, fel_number, fel_certified_at`) que **quedan NULL** hasta
  integrar un certificador FEL real — ver `src/services/felCertifier.js`.
- **invoice_items**: snapshot de líneas al momento de facturar. Si la orden tiene `quote_id`, se copian
  de `quote_items`; si no, es una sola línea "Servicio según orden de trabajo No. X" con
  `work_orders.total` (`work_order_items` no tiene precio, es solo checklist de piezas).

Configuración general (`032_system_settings.sql`):
- **system_settings**: tabla **clave/valor** (`setting_key` PK, `setting_value` TEXT, `updated_at`).
  Es clave/valor a propósito: qué ajustes existen, de qué tipo son y su valor por defecto se declara
  en `SETTINGS_SCHEMA` de [src/services/settingsService.js](src/services/settingsService.js), que es
  la **fuente de verdad** — agregar un ajuste nuevo es una línea ahí, **sin migración**.
- Hoy guarda: `theme_default` (`light|dark|system`), `color_primary`/`color_accent` (hex de marca),
  `company_name/tagline/address/phone/email/nit` y `quote_valid_days`.
- `getSettings()` siempre devuelve **todas** las claves (lo que no esté guardado sale con su default)
  y tolera que la migración no esté aplicada (`ER_NO_SUCH_TABLE` → defaults), para que el sistema no
  se caiga si alguien actualiza el código sin correr el script.
- **Permisos:** `settings.view` (ver la pantalla) y `settings.update` (guardar), ids 57–58, solo rol
  Administrador. `GET /api/settings` **no exige permiso**, solo sesión: el tema y los colores se le
  aplican a todos los usuarios, y si esto requiriera un permiso un rol sin él vería la app descolorida.

`src/data/*.json` y `src/lib/jsonStore.js` son legacy (ver "Base de datos" arriba): nada los lee en
runtime, solo los escribe `npm run seed`.

## Inventario — notas

- Endpoints: `/articles` (CRUD + `POST /articles/bulk` carga masiva + `POST /articles/upload-image`),
  `/warehouses` y `/article-types` (CRUD). Borrado de tipo/bodega bloqueado (409) si hay artículos.
- **Alta rápida de Mano de Obra/Repuesto desde una cotización** (`components/quotes/ArticleQuickModal.jsx`):
  crea un `article` con `type_id`/`warehouse_id` **fijos** (`4`/`3` para mano de obra, `2`/`2` para
  repuestos — sembrados en `023_labor_catalog_seed.sql`), y para repuestos exige elegir una
  `part_category` (catálogo sembrado y gestionable en `/configuracion/categorias-pieza`,
  `024_part_categories_management.sql`, permisos `part-categories.*`). Si alguna vez esos catálogos
  quedan vacíos o esos ids fijos no existen, esta pantalla vuelve a fallar con
  `ER_NO_REFERENCED_ROW` ("Uno de los datos seleccionados ya no existe").
- **Imágenes:** `upload-image` usa `multer` ([middleware/upload.middleware.js](src/middleware/upload.middleware.js)),
  guarda en `uploads/` (gitignored) y devuelve `{ url: '/api/uploads/<archivo>' }`. Se sirven con
  `express.static` en `/api/uploads` (cubierto por el proxy de Vite en dev). Una URL externa se guarda tal cual.
  El filtro acepta los formatos de cámara/celular (JPEG, PNG, WEBP, GIF, BMP, TIFF, HEIC/HEIF, AVIF) y,
  si el celular manda un mime genérico (`application/octet-stream` o vacío), decide por la extensión;
  límite 12 MB. **SVG queda fuera a propósito** (se sirve desde el mismo dominio y puede llevar scripts).
  Normalmente lo que llega es un JPG: el frontend ya convierte las imágenes con canvas antes de subirlas
  (`frontend/src/lib/image.js`) — importante porque **`pdfkit` solo sabe embeber JPEG/PNG**, así que un
  WEBP/HEIC crudo saldría como rectángulo gris en el PDF del reporte.
- **Carga masiva:** el Excel se parsea en el frontend; `POST /articles/bulk` recibe `{ items }` con
  tipo y bodega **por nombre**, valida fila por fila e inserta las válidas
  (`articleService.bulkCreate` → `{ created, errors:[{row,message}] }`).

## Clientes — notas

- Tablas: **clients** (`nit?, dpi?, first_name, last_name, email, address, phone, client_type_id?,
  loyalty_tier_id?, is_active`), **client_types** (catálogo) y **loyalty_tiers** (fidelización:
  `name, discount, benefits, color, icon`). `color` es un hex `#RRGGBB` e `icon` es una key de
  icono (lucide) para el distintivo visual del nivel. Migraciones `008_clients.sql` /
  `009_clients_seed.sql` / `010_loyalty_tier_appearance.sql`.
- Endpoints: `/clients` (CRUD), `/client-types` y `/loyalty-tiers` (CRUD). Borrado de tipo/nivel
  bloqueado (409) si hay clientes que lo usan.
- **Regla NIT/DPI:** al menos uno debe venir (solo uno puede quedar vacío); se valida en el schema
  zod de `clientRoutes` y de nuevo en `clientService`. NIT y DPI son únicos cuando no están vacíos.
- `clientService.toPublic` resuelve `full_name`, `client_type_name`, `loyalty_tier_name`,
  `loyalty_tier_color`, `loyalty_tier_icon`, `loyalty_discount` y `loyalty_benefits`.
- **Permisos:** `clients.*`, `client-types.*`, `loyalty.*` (ids 23–34 en el seed). Para topear datos
  ya sembrados sin reinicializar: `node scripts/backfill_clients.mjs` (idempotente) y
  `node scripts/backfill_loyalty_appearance.mjs` (agrega `color`/`icon` a niveles existentes).

## Órdenes de trabajo, cotizaciones, máquinas y mantenimiento — notas

- Endpoints: `/work-orders`, `/quotes`, `/machines`, `/maintenance`, `/part-categories` (todos CRUD);
  `/work-orders/:id/pdf` y `/quotes/:id/pdf` generan el PDF con `pdfkit`
  ([utils/pdfGenerator.js](src/utils/pdfGenerator.js): `generarOrdenTrabajoPDF`/`generarCotizacionPDF`).
  `PATCH /work-orders/:id/status` y `/quotes/:id/status` cambian solo el estado.
- **Datos del taller en los PDF:** los 5 generadores reciben la configuración como **segundo
  parámetro** (`generarXPDF(entidad, settings)`) y el controller se la pasa con
  `await settingsService.getSettings()`. El nombre, giro, dirección, teléfono y NIT del encabezado y
  del pie salen de ahí (antes estaban escritos a mano, con un teléfono de relleno `0000-0000`), igual
  que los días de vigencia impresos en el pie de la cotización. Si a un generador no se le pasa
  `settings`, cae a `EMPRESA_FALLBACK` — los mismos textos de antes. Los **colores** de los PDF siguen
  fijos en `pdfGenerator.js` (no siguen los colores de marca de la configuración).
- **RBAC más laxo:** a diferencia de Inventario/Clientes, estas rutas no tienen permisos granulares —
  todas están detrás de `requirePermission('dashboard.view')` (ver `*Routes.js` de estos recursos).
  Si agregas permisos finos (`work-orders.create`, etc.), tendrás que sembrarlos vía un nuevo script
  en `migraciones/` y actualizar las rutas.
- `quoteService.calcTotals`/`quoteService.normalize` calculan `subtotal`/`total` a partir de
  `items[].quantity * items[].unit_price - discount` al crear/actualizar.
- **Órdenes de trabajo sin precios (a propósito):** por decisión de negocio, el módulo de Órdenes de
  Trabajo (formulario, lista, `WorkOrderViewModal` y `generarOrdenTrabajoPDF`) **no muestra precios** —
  las órdenes las trabajan técnicos, y el precio es cosa de administración (Cotizaciones/Facturación).
  La columna `work_orders.total` sigue existiendo y se sigue llenando internamente (prellenada desde
  la cotización de origen al crear la orden vía `?fromQuote=`), solo que no hay ningún campo ni texto
  en pantalla para verla o editarla. Si se necesita mostrarla en algún punto, es una decisión de
  producto, no un bug.
- `received_at`/`delivery_at` vacíos (`''`) se normalizan a `null` en `workOrderService.create/update`
  antes de llegar a MySQL — una columna `DATE` rechaza `''` con `ER_TRUNCATED_WRONG_VALUE`
  ("no tiene un formato válido"). Si agregas un campo `DATE`/`DATETIME` nuevo en cualquier módulo,
  replica esa normalización ahí también.

## Reportes de trabajo y Facturación — notas

- Estos dos módulos sí usan permisos granulares (`work-reports.view/create/update/delete`,
  `billing.view/create/certify`, ids 37–43 en `020_reports_billing_seed.sql`) — a diferencia de
  órdenes/cotizaciones/máquinas/mantenimiento, que siguen detrás de `dashboard.view`.
- `workReportService.createForOrder(workOrderId)` es **idempotente**: si la orden ya tiene reporte, lo
  devuelve en vez de crear otro (es lo que llama el botón "Reporte" de `WorkOrdersPage`).
  `invoiceService.createFromWorkReport(report)` es igual de idempotente vía `UNIQUE work_order_id`.
- **Certificación FEL:** `invoiceService.certify(id, email)` llama a `felCertifier.certify(invoice)`
  (`src/services/felCertifier.js`), que hoy es un **stub** — devuelve todo `null` a propósito. El
  estado interno de la factura sí avanza a `certificada` (uso administrativo), pero **no genera un
  UUID/serie fiscal real** ni hace ninguna llamada externa. No "arregles" esto rellenando datos falsos:
  cuando se contrate un certificador (Digifact/Infile/Megaprint/etc.), la integración real va dentro de
  esa función, sin tocar `invoiceService` ni las rutas. `generarFacturaPDF` imprime un aviso visible
  cuando `fel_uuid` es null.
- El envío del correo de certificación **no está implementado** (no hay SMTP/nodemailer en el backend).
  El frontend captura y guarda el correo (`invoices.client_email`), pero no se envía nada todavía.
- **Editar un reporte finalizado:** por defecto, un reporte `finalizado` queda de solo lectura (fotos y
  notas) para todos. El permiso `work-reports.force-edit` (id 44, `021_work_reports_force_edit.sql`,
  solo rol Administrador) salta ese bloqueo — `workReportService.update/addPhoto/removePhoto` reciben
  un `canForceEdit` que el controller arma desde `req.user.permissions`. El botón "Finalizar Reporte"
  nunca vuelve a aparecer (evita regenerar la factura), solo "Guardar Notas" y la galería de fotos.
- **Firmas** (`022_work_reports_signatures.sql`): `work_reports.tech_signature_url/name` y
  `client_signature_url/name`. Se capturan dibujando a mano en un `<canvas>` en el frontend
  (`components/reports/SignaturePad.jsx`, sin librería externa), se exportan a PNG
  (`canvas.toBlob`) y se suben igual que una foto de etapa: `POST /work-reports/:id/signature`
  (multipart, campo `photo`, reutiliza `uploadReportPhoto`; body `role` `tech`/`client` + `name`).
  Respeta el mismo bloqueo de "finalizado" que fotos/notas.
- **PDF del reporte:** `GET /work-reports/:id/pdf` → `generarReportePDF` en `pdfGenerator.js`. Dibuja
  las fotos de cada etapa embebiendo el archivo real desde `UPLOADS_DIR` (no la URL) — si el archivo no
  existe en disco, cae a un rectángulo gris en vez de romper el PDF. Las firmas se embeben igual, con el
  nombre impreso debajo. Mismo patrón visual (bandas de color, pie de página) que los otros PDFs.
