# Migraciones — Base de datos MySQL

Esquema real del sistema en MySQL 8 — el backend ya usa esta base (`src/repositories/*.js` vía
`src/lib/db.js`), no archivos JSON. No hay migrador automático: hay que aplicar estos scripts a mano,
en orden, sobre la base de datos.

## Convención

- Los scripts se numeran de forma incremental y nunca se editan una vez aplicados:
  `001_init.sql`, `002_seed.sql`, `003_*.sql`, …
- Cada cambio de esquema (nueva tabla, columna, índice) es un **nuevo** script numerado.
- Orden de ejecución = orden numérico.

## Cómo aplicar

```bash
# Crear la base (una sola vez)
mysql -u root -p -e "CREATE DATABASE taller_aeg CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# Aplicar los scripts en orden
mysql -u root -p taller_aeg < 001_init.sql
mysql -u root -p taller_aeg < 002_seed.sql
```

## Scripts

| Script | Descripción |
|--------|-------------|
| `001_init.sql` | Tablas `roles`, `permissions`, `role_permissions`, `users` con llaves foráneas e índices. |
| `002_seed.sql` | Datos iniciales: roles, catálogo de permisos, su mapeo y el usuario administrador. |
| `003_inventory.sql` | Tablas `warehouses`, `article_types`, `articles` (inventario) con FKs e índices. |
| `004_inventory_seed.sql` | Permisos del inventario, su mapeo a roles, y tipos/bodegas por defecto. |
| `005_warehouse_color.sql` | Agrega la columna `color` a `warehouses`. |
| `006_article_pieces.sql` | Tabla `article_pieces` (piezas/items que componen un artículo) con FK a `articles`. |
| `007_article_labor.sql` | Tabla `article_labor` (mano de obra de un artículo) con FK a `articles`. |
| `008_clients.sql` | Tablas `client_types`, `loyalty_tiers` (fidelización) y `clients` con FKs e índices. |
| `009_clients_seed.sql` | Permisos del módulo de clientes, su mapeo a roles, y tipos/niveles por defecto. |
| `010_loyalty_tier_appearance.sql` | Agrega `color` e `icon` a `loyalty_tiers`. |
| `011_work_orders.sql` | Tablas del módulo de órdenes de trabajo. |
| `012_machines_maintenance.sql` | Tablas de máquinas y mantenimientos programados. |
| `013_clients_nullable_optional.sql` | Hace `email` de `clients` nullable (campo opcional). `last_name` sigue obligatorio. |
| `014_clients_validation.sql` | Agrega `is_validated` a `clients` y los permisos `clients.quick-create` y `clients.validate` (con su mapeo a roles). |
| `015_quotes.sql` | Tablas `quotes`/`quote_items` (catch-up: el codigo ya las usaba sin migracion). |
| `016_part_categories.sql` | Tabla `part_categories` (catch-up, mismo motivo). |
| `017_work_orders_quote_link.sql` | Agrega `quote_id` a `work_orders` (FK a `quotes`, `ON DELETE SET NULL`). |
| `018_work_reports.sql` | Tablas `work_reports` y `work_report_photos` (reporte fotografico en 4 etapas por orden). |
| `019_invoices.sql` | Tablas `invoices` e `invoice_items`. Campos `fel_*` quedan NULL hasta integrar un certificador FEL real. |
| `020_reports_billing_seed.sql` | Permisos `work-reports.*`/`billing.*` y su mapeo a roles. |
| `021_work_reports_force_edit.sql` | Permiso `work-reports.force-edit` (solo Administrador): editar fotos/notas de un reporte ya finalizado. |
| `022_work_reports_signatures.sql` | Agrega `tech_signature_url/name` y `client_signature_url/name` a `work_reports`. |
| `023_labor_catalog_seed.sql` | Agrega el tipo de artículo `Mano de Obra` (id 4) y la bodega lógica `Servicios` (id 3) — el alta rápida de mano de obra desde Cotizaciones los asume fijos y fallaba sin ellos. |
| `024_part_categories_management.sql` | Siembra categorías iniciales en `part_categories` (estaba vacía) y agrega permisos `part-categories.*` para la pantalla de gestión nueva. |

> Nota sobre la contraseña del admin en `002_seed.sql`: MySQL no genera hashes bcrypt. El script
> trae un hash válido para `Admin123!`. Para regenerarlo:
> `node -e "console.log(require('bcryptjs').hashSync('Admin123!',10))"`
