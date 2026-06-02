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
- **Configuración** (`pages/config/`): `ArticleTypesPage` y `WarehousesPage`, ambas envuelven el
  CRUD reutilizable `components/config/CatalogManager` (catálogos `{ name, description, is_active }`).
- **Sidebar contraíble:** `Sidebar` guarda `collapsed` en localStorage; el botón "Contraer" (abajo)
  alterna icono-solo. El nav se agrupa por secciones (Configuración / Administración).

## Imágenes

- `public/logo.png` — logo de marca (copia de `Propuesta 2.png`).
- `public/img/carrusel/` — slides del login. Son placeholders de marca; reemplázalos por las
  imágenes definitivas conservando los nombres o ajusta la lista en `ImageCarousel`.
- Imágenes de artículos: se suben al backend y se referencian como `/api/uploads/<archivo>`
  (o una URL externa). El `<img>` resuelve esa ruta vía el proxy de Vite en dev.
