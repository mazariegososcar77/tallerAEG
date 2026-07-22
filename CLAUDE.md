# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Qué es esto

Sistema web interno de **Taller AEG** (taller de motores eléctricos). Monorepo con dos apps
independientes:

- `frontend/` — React 18 + Vite + Tailwind CSS. Ver [frontend/CLAUDE.md](frontend/CLAUDE.md).
- `backend/`  — Node.js + Express (ESM) + Swagger. Ver [backend/CLAUDE.md](backend/CLAUDE.md).

Módulos implementados, funcionales end-to-end:
1. **Auth + Dashboard + Usuarios/Roles/Permisos (RBAC)**.
2. **Inventario**: artículos (con imagen, piezas, mano de obra y carga masiva por Excel) y catálogos
   configurables en **Configuración** (tipos de artículo y bodegas).
3. **Clientes**: registro/edición/visualización de clientes (NIT/DPI, datos de contacto, tipo y nivel
   de fidelización) y catálogos configurables en **Configuración** (tipos de cliente y fidelización).
4. **Órdenes de trabajo** (`/ordenes`): ficha del equipo recibido, ítems/piezas, técnicos, estado
   (`recibido → en_proceso → listo → entregado`/`cancelado`) y descarga de PDF.
5. **Cotizaciones** (`/cotizaciones`): ítems con categoría de pieza, subtotal/descuento/total y
   descarga de PDF; usa el catálogo `part-categories`.
6. **Máquinas y mantenimiento** (`/maquinas`, `/mantenimientos`): equipos por cliente y calendario de
   mantenimientos programados (frecuencia, próximo servicio, estado `al_dia`/`proximo`/`vencido`).
7. **Reportes de trabajo** (`/reportes`): documentación fotográfica de una orden en 4 etapas fijas
   (antes de desarmar, desarmado + piezas nuevas, piezas instaladas + usadas, armado final), varias
   fotos y una nota por etapa. Se crea desde el botón "Reporte" de una orden de trabajo
   (`work-reports.createForOrder`, idempotente: una orden solo tiene un reporte). Al finalizarlo
   genera automáticamente la factura correspondiente.
8. **Facturación** (`/facturacion`): lista de facturas con filtro por cliente/fecha/"solo pendientes"
   y certificación (captura el correo del cliente, prellenado desde su ficha). La certificación **FEL
   real está pendiente de integrar** (ver [backend/src/services/felCertifier.js](backend/src/services/felCertifier.js))
   — hoy solo cambia el estado interno, no genera un UUID/serie fiscal válido.

Flujo completo: **Cotización → Orden de Trabajo → Reporte de Trabajo → Factura**, vinculado por FKs
reales (`work_orders.quote_id`, `work_reports.work_order_id`, `invoices.work_order_id/quote_id`). Una
cotización con varios equipos (`quotes.equipment_data[]`) genera una orden por equipo — no hay
creación masiva, el usuario repite "Crear Orden" por cada equipo desde `QuotesPage`.

Los módulos 4–6 (y sus rutas `work-orders`/`quotes`/`machines`/`maintenance`/`part-categories`) están
gateados en el backend solo con el permiso genérico `dashboard.view` (no tienen permisos granulares
`*.view/create/update/delete` como Inventario/Clientes todavía) — tenlo en cuenta si agregas RBAC fino
ahí. Los módulos 7–8 sí usan permisos granulares (`work-reports.*`, `billing.*`) desde el inicio.
Algunas páginas de **Configuración** (`configuracion/general`, `/parametros`, `/catalogos`) son
placeholders "Coming Soon" (`ComingSoonPage`), no funcionalidad real.

## Estado de la persistencia (importante)

**Ya hay base de datos real: MySQL.** Todos los repositorios (`backend/src/repositories/*.js`)
consultan MySQL vía el pool de `mysql2` en [backend/src/lib/db.js](backend/src/lib/db.js) — ya no leen
JSON. El esquema vive como scripts SQL incrementales y numerados en
[backend/migraciones/](backend/migraciones/) (`001_init.sql` … `020_reports_billing_seed.sql`); **hay
que aplicarlos a mano** (no hay migrador automático — ver siguiente sección).

Detalle que puede confundir: `backend/src/seed.js` (`npm run seed`) es **legacy** — todavía escribe a
los archivos JSON de `backend/src/data/` vía `backend/src/lib/jsonStore.js`, pero **ningún repositorio
los lee**. Correrlo no inicializa datos para la app real; los datos iniciales (roles, permisos,
usuario admin, catálogos) se cargan aplicando los scripts `..._seed.sql` de `migraciones/`. No
confundas este seed con el de la base de datos.

## Levantar el sistema en desarrollo

Requiere una base MySQL corriendo. Variables de conexión (`backend/.env`, ver
[backend/.env.example](backend/.env.example) — que hoy **no** incluye las de DB) y sus defaults en
[backend/src/lib/db.js](backend/src/lib/db.js): `DB_HOST` (localhost), `DB_PORT` (3306), `DB_NAME`
(talleraeg), `DB_USER` (aeg_user), `DB_PASSWORD`.

```bash
# Una sola vez: crear la base y aplicar las migraciones en orden numérico
mysql -u root -p -e "CREATE DATABASE talleraeg CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
cd backend/migraciones
for f in *.sql; do mysql -u root -p talleraeg < "$f"; done   # o uno por uno, en orden

# Terminal 1 — backend (http://localhost:4000, docs en /api/docs)
cd backend
npm install
npm run dev       # OJO: `npm run seed` NO llena la base MySQL (ver sección anterior)

# Terminal 2 — frontend (http://localhost:5173)
cd frontend
npm install
npm run dev
```

Vite redirige `/api` al backend (puerto 4000), así que el cliente usa rutas relativas.

Credenciales por defecto (creadas por `002_seed.sql`): **admin@talleraeg.com / Admin123!**

## Convenciones transversales

- **Idioma:** la interfaz visible está en español; los identificadores de código (variables,
  funciones, archivos) en inglés.
- **Marca / colores:** verde oscuro `#164B2C` y amarillo dorado `#CA8A04`, definidos como escalas en
  `frontend/tailwind.config.js`. Por compatibilidad, los tokens **conservan los nombres** `navy`
  (= verde) y `orange` (= amarillo), así que las clases Tailwind existentes no cambian. El tema por
  defecto es **claro** (el oscuro sigue disponible con el botón sol/luna del topbar). El logo es
  `Propuesta 2.png` (copiado a `frontend/public/logo.png`).
- Cada subproyecto tiene su propio `CLAUDE.md` con los detalles de arquitectura y comandos.
