# Migraciones — Base de datos MySQL

Esquema **destino** del sistema en MySQL 8. Mientras el backend usa archivos JSON
(`src/data/`), estos scripts dejan lista la estructura para cuando se instale la base de datos real.
La forma de los JSON refleja estas tablas, así que migrar será reescribir la capa
`src/repositories/` sin tocar servicios ni controladores.

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

> Nota sobre la contraseña del admin en `002_seed.sql`: MySQL no genera hashes bcrypt. El script
> trae un hash válido para `Admin123!`. Para regenerarlo:
> `node -e "console.log(require('bcryptjs').hashSync('Admin123!',10))"`
