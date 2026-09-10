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

## Archivos y Google Cloud Storage

Fotos, firmas, videos y documentos adjuntos **ya no se guardan en el disco del servidor**: el navegador
los sube directo a un bucket privado de GCS con una URL firmada, y en MySQL solo queda la ruta del
objeto (`reportes/2026/08/<uuid>.jpg`). Guía completa y rollout en
[docs/integracion-gcp-storage.md](../docs/integracion-gcp-storage.md).

- **Única variable de entorno:** `GCS_BUCKET` (`talleraeg-media-prod` / `talleraeg-media-dev`). **No hay
  llave JSON** ni `GOOGLE_APPLICATION_CREDENTIALS`: la VM tiene adjunta la service account
  `talleraeg-storage` y la librería consigue credenciales por ADC, firmando las URLs vía IAM `signBlob`.
  Si la variable está **vacía**, todo el sistema vuelve a guardar en `uploads/` como antes — mismo
  criterio que el stub de Digifact. Es lo que permite trabajar sin credenciales de Google.
- [src/lib/gcsStorage.js](src/lib/gcsStorage.js) es el **único** punto que habla con GCS (cliente
  singleton + caché de URLs firmadas: sin llave local cada firma es una llamada de red a IAM, y sin
  caché abrir un reporte de 30 fotos serían 30 llamadas).
- [src/lib/mediaUrl.js](src/lib/mediaUrl.js) hace la **lectura dual**: un valor `/uploads/…` se devuelve
  igual que siempre, uno `https://…` también (URL externa de `articles.image_url`), y una ruta de objeto
  se firma al vuelo. Los tres formatos conviven indefinidamente. **Nunca se guarda una URL firmada en la
  base.**
- **Escritura:** `POST /api/uploads/signed-url` ([uploadService.js](src/services/uploadService.js))
  entrega la URL firmada; después el endpoint de siempre recibe `object_path` en un body JSON. El
  middleware `soloSiEsMultipart()` deja convivir ese JSON con la subida multipart vieja.
- **Cuidado al agregar campos:** si el frontend reenvía un campo de media al guardar (pasa con
  `articles.image_url` y con la orden de servicio completa), **no** puede recibir la URL firmada en ese
  mismo campo o se escribiría en MySQL. Por eso `articles` expone `image_display_url` aparte y
  `serviceOrderService.update` descarta las firmas.
- **PDF:** `pdfkit` embebe archivos, no URLs. Los controllers de PDF usan el registro **sin resolver** y
  llaman `prepararLocales()`/`limpiarLocales()`, que bajan los objetos a un temporal en streaming. Es el
  único punto donde los bytes de una imagen vuelven a pasar por el backend.
- **El video es la excepción:** sigue viajando al backend porque `ffprobe`/`ffmpeg` trabajan sobre
  archivos; lo que cambió es que el MP4 comprimido se sube al bucket y los locales se borran.
- **Migración de lo que ya existía:** `node scripts/migrate-uploads-to-gcs.mjs --dry-run` (lotes,
  reanudable, idempotente, no borra nada).

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

## Notificaciones automaticas (n8n) — notas

El backend **no manda correos** (no hay SMTP/nodemailer, sigue sin haberlo). Decide *qué* avisar,
*a quién* y con *qué texto* (HTML + texto plano ya redactados), y hace un `POST` al webhook de n8n.
Del otro lado hay **un solo workflow**: `Webhook (POST) → Send Email`. Toda la lógica está en
[src/services/notificationService.js](src/services/notificationService.js).

**Todo es push. n8n nunca le pregunta nada al sistema** — no hay endpoints expuestos hacia afuera ni
claves de integración. Esa decisión es la que obliga a que el reloj viva en el backend
([src/lib/notificationScheduler.js](src/lib/notificationScheduler.js)): si n8n tuviera que preguntar
"¿qué hay pendiente?", habría que abrirle una ruta y repartirle un token.

| Aviso | Qué lo dispara | Dónde |
|---|---|---|
| `low_stock`, `maintenance_due`, `quote_expiring` | el reloj, 1×/día a `notif_daily_hour` | `runScheduledChecks()` |
| `work_order_created` | crear una orden | `workOrderService.create` |
| `quote_email` | botón manual "Enviar por correo" | `POST /quotes/:id/send-email` |
| `test` | botón "Enviar prueba" de la pantalla | `POST /notifications/test` |

**El mensaje al webhook va plano a propósito** — `event`, `to` (texto con los correos separados por
coma, que es lo que espera el campo "To" del nodo de correo), `subject`, `html`, `text`, y para la
cotización `adjunto_nombre` / `adjunto_tipo` / `adjunto_base64`. Sin objetos anidados: del otro lado
hay un webhook simple y cada dato se usa directo como `{{ $json.subject }}`.

- **El programador** no usa `node-cron` ni ninguna librería: se asoma al reloj cada 10 minutos y
  corre cuando la hora coincide (`ultimaCorrida` evita repetir dentro de la misma hora). Es **seguro
  que corra de más** — la deduplicación es la red de seguridad real, no el temporizador. Se arranca
  en `server.js` y **no** en `app.js`, para que importar la app (una prueba, un script) no deje
  temporizadores vivos. `unref()` para que un Ctrl+C no espere 10 minutos.
- **Deduplicación:** `VENTANA_HORAS` en `notificationService.js` — 24 h para stock y cotizaciones,
  **7 días para mantenimientos** (recordar a diario el mismo mantenimiento a 15 días vista solo logra
  que dejen de leerse los correos). Se escribe en `notifications_log` **solo después de que n8n
  confirma** que recibió el aviso. Al revés, un correo que nunca salió quedaría marcado como enviado
  para siempre; así, si n8n está caído, el pendiente se reintenta en la revisión siguiente.
- **Cada tipo se resuelve por su cuenta:** un fallo consultando stock no puede dejar sin revisar
  mantenimientos y cotizaciones. `runScheduledChecks` devuelve un resumen por tipo
  (`enviado`/`nada_pendiente`/`apagado`/`sin_destinatario`/`fallo_envio`/`error`) que la pantalla
  muestra y el programador escribe en la consola.
- **`POST /notifications/run`** corre esa misma revisión en el momento (botón "Revisar ahora"), y
  **`/log`** y **`/test`** son para la pantalla. Los tres piden sesión y `settings.view`/`settings.update`.

**`GET /settings` recorta los ajustes sensibles.** Ese endpoint no exige permiso a propósito (el
tema y los colores se le aplican a todos), pero la URL del webhook y las listas de correo no pueden
viajar a cualquier sesión: el webhook de n8n **no tiene credenciales**, así que esa URL *es* la
credencial — quien la copie manda correos con la identidad del taller sin pasar por el sistema. Las
claves marcadas `sensible: true` en `SETTINGS_SCHEMA` (`SENSITIVE_SETTING_KEYS`) solo salen con
`settings.view`; para los demás roles el controller aplica `stripSensitive()`. Si agregas un ajuste
que sea un secreto, márcalo igual.

**Configuración:** ajustes de `system_settings` como cualquier otro, en `SETTINGS_SCHEMA` —
`n8n_webhook_url`, `notif_daily_hour`, y por aviso `notif_<x>_enabled` / `notif_<x>_email`
(+ `_days` donde aplica). **No hacen falta migraciones para agregar otro aviso.** Se agregaron dos
tipos al esquema de ajustes: `bool` (se guarda como `'1'`/`'0'`) y `emails` (lista separada por
comas, se valida cada dirección por separado; `parseEmails()` la convierte en array).

**Regla que no se debe romper: un fallo notificando nunca puede tumbar la operación.** `emit()` y
`emitWorkOrderCreated()` atrapan todo (incluido un fallo leyendo la configuración) y solo dejan
rastro en la consola; `workOrderService.create` además ignora la promesa. Si n8n está caído, la orden
igual se guarda. La excepción es `sendQuoteEmail`: ahí el usuario apretó un botón y espera saber si
salió, así que un fallo sí sube como `502`.

**Depende de dos migraciones ya existentes:** `038_articles_min_stock.sql` (`articles.min_stock`, el
punto de reorden; `0` = ese artículo no avisa) y `039_notifications_log.sql` (la tabla de
deduplicación). Si falta la 039, `notificationRepository` lo dice con todas sus letras en vez de
fallar con un error de MySQL — o peor, reenviar todo en cada corrida. El comentario de cabecera de
esa migración quedó desactualizado: describe el diseño anterior, en el que n8n consultaba la tabla
por su cuenta. Hoy la escribe el backend.

**El estado del mantenimiento se recalcula al avisar.** `maintenance_schedules.status` es una columna
materializada que solo se escribe en `maintenanceRepository.create/update`: un registro guardado hace
dos meses como `proximo` sigue diciendo `proximo` hoy aunque su fecha ya pasara. Como el correo existe
justo para gritar lo vencido, `estaVencido()` compara `next_service` contra la fecha de hoy en vez de
confiar en la columna. (La pantalla de Mantenimientos sí usa la columna guardada — mismo desfase,
pero eso es anterior a esto.)

**Enviar una cotización por correo** (`POST /quotes/:id/send-email`, body `{ email, message? }`) no
es un aviso automático: es una acción manual. Si la cotización estaba en `borrador` pasa a `enviada`
— no es cosmético: el aviso de "cotizaciones por vencer" solo mira las `enviada`, así que sin eso una
cotización mandada por correo nunca generaría seguimiento. Los demás estados no se tocan. Es también
el único correo que sale **hacia un cliente**, así que lleva saludo, vigencia y los datos de contacto
del taller, y su pie no menciona la configuración del sistema (parámetro `pie` de `cuerpoHtml`).
El registro en `notifications_log` va dentro de un `try/catch`: si fallara *después* del envío, el
usuario vería un error, volvería a apretar "Enviar" y el cliente recibiría la cotización dos veces. El controller genera el PDF con `pdfABuffer()` (helper
en `pdfGenerator.js`: junta el documento en memoria en vez de hacer `.pipe(res)`) y lo manda en
base64 dentro del mismo mensaje, para que n8n no tenga que volver a pedirlo. `quoteRepository` expone
`client_email` por JOIN para proponerlo en pantalla — y por eso `quoteService.create/update` lo
descartan del payload, igual que `client_name` (no es una columna de `quotes`).

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
- **Imágenes:** ver "Archivos y Google Cloud Storage" abajo — la subida normal ya no pasa por el
  backend. `upload-image` (multer a `uploads/`) sigue existiendo como camino de respaldo cuando
  `GCS_BUCKET` está vacío, y devuelve `{ url: '/uploads/<archivo>' }`. Los archivos viejos se siguen
  sirviendo con `express.static` en `/api/uploads` (cubierto por el proxy de Vite en dev). Una URL
  externa se guarda tal cual.
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
  (`src/services/felCertifier.js`). Ya está conectado a **Digifact** (`src/lib/digifactClient.js` +
  `src/lib/nucBuilder.js`, basados en `documentacion.digifact.com/gt/api` y el PDF
  `Documentacion_Tecnica_API_NUC_Digifact_GT_V2_0_6.pdf` que entrega Digifact con las credenciales),
  pero **sigue comportándose como el stub original mientras falten credenciales**:
  `felCertifier.certify` revisa `digifactClient._internal.isConfigured()` (¿hay
  `DIGIFACT_NIT/USERNAME/PASSWORD` en `.env`?) y si no las hay devuelve todo `null` sin llamar a
  nadie — el estado interno de la factura avanza a `certificada` igual (uso administrativo), pero
  **no genera un UUID/serie fiscal real**. No "arregles" esto rellenando datos falsos.
  `generarFacturaPDF` imprime un aviso visible cuando `fel_uuid` es null. Antes de poner
  credenciales reales: confirmar con Digifact/el contador el régimen de IVA (`AfiliacionIVA`), el
  establecimiento y el código geográfico SAT (variables `DIGIFACT_*` en `.env.example`), y probar
  primero contra `DIGIFACT_ENV=test`.
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
