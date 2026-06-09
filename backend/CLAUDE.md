# CLAUDE.md — Backend Taller AEG

API REST en **Node.js + Express (ESM)**. Autenticación JWT, control de acceso por permisos (RBAC) y
documentación Swagger. Persistencia temporal en archivos JSON.

## Comandos

```bash
npm install
npm run seed   # crea/rellena src/data/*.json con datos por defecto (idempotente)
npm run dev    # nodemon (recarga al guardar)
npm start      # produccion
```

- Servidor: `http://localhost:4000`
- Documentación Swagger UI: `http://localhost:4000/api/docs`
- Healthcheck: `GET http://localhost:4000/api/health`
- Admin por defecto: **admin@talleraeg.com / Admin123!**

## Arquitectura por capas

El flujo de una petición es **route → middleware → controller → service → repository → jsonStore**.
Cada capa tiene una sola responsabilidad:

| Capa | Carpeta | Responsabilidad |
|------|---------|-----------------|
| Rutas | `src/routes/` | Definen endpoints, aplican middleware y llevan los comentarios JSDoc de Swagger. |
| Controladores | `src/controllers/` | Finos: leen `req`, llaman al service, responden. Sin lógica de negocio. |
| Servicios | `src/services/` | Lógica de negocio y reglas (hash de password, validar email único, etc.). |
| Repositorios | `src/repositories/` | Único punto que conoce el origen de datos. Hoy JSON, mañana MySQL. |
| Store | `src/lib/jsonStore.js` | Lectura/escritura atómica de los archivos JSON. |

**Regla clave:** para cambiar de JSON a MySQL solo se reescriben los repositorios. No toques
servicios ni controladores para eso.

## Cómo agregar un endpoint nuevo

1. Si toca datos nuevos, agrégalos primero en `src/repositories/` (y a la migración SQL, ver abajo).
2. Lógica de negocio en el `service` correspondiente.
3. Handler delgado en el `controller`.
4. Registra la ruta en `src/routes/<recurso>Routes.js`, aplica `authenticate` y
   `requirePermission('<code>')` según corresponda, y añade el bloque JSDoc `@openapi` para Swagger.
5. Validación de body con un esquema **zod** pasado a `validate(schema)`.

## Auth y RBAC

- `POST /api/auth/login` valida con **bcryptjs** y emite un JWT con `{ sub, roleId, permissions[] }`.
- `auth.middleware.js` → `authenticate`: exige `Authorization: Bearer <token>`, adjunta `req.user`.
- `rbac.middleware.js` → `requirePermission('users.create')`: 403 si el usuario no tiene el permiso.
- Errores: lanza `new ApiError(status, mensaje)`; `error.middleware.js` los formatea como
  `{ error, details? }`.

## Migraciones SQL (`migraciones/`)

Esquema MySQL destino como scripts incrementales y numerados (`001_init.sql`, `002_seed.sql`, …).
Convención y forma de aplicarlos documentadas en [migraciones/README.md](migraciones/README.md).
**Al cambiar el modelo de datos, crea un nuevo script numerado** (nunca edites uno ya aplicado) y
mantén alineada la forma de los JSON de `src/data/`.

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

`src/data/` está en `.gitignore` (se regenera con `npm run seed`).

## Inventario — notas

- Endpoints: `/articles` (CRUD + `POST /articles/bulk` carga masiva + `POST /articles/upload-image`),
  `/warehouses` y `/article-types` (CRUD). Borrado de tipo/bodega bloqueado (409) si hay artículos.
- **Imágenes:** `upload-image` usa `multer` ([middleware/upload.middleware.js](src/middleware/upload.middleware.js)),
  guarda en `uploads/` (gitignored) y devuelve `{ url: '/api/uploads/<archivo>' }`. Se sirven con
  `express.static` en `/api/uploads` (cubierto por el proxy de Vite en dev). Una URL externa se guarda tal cual.
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
