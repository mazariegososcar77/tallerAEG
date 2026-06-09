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

## Estado de la persistencia (importante)

Aún **no hay base de datos**. El backend guarda los datos en archivos JSON (`backend/src/data/`),
pero el esquema MySQL destino vive como scripts SQL incrementales en
[backend/migraciones/](backend/migraciones/). La forma de los JSON refleja ese esquema, de modo que
migrar a MySQL sea solo reescribir la capa de repositorios (`backend/src/repositories/`), sin tocar
servicios ni controladores.

## Levantar el sistema en desarrollo

Dos terminales:

```bash
# Terminal 1 — backend (http://localhost:4000, docs en /api/docs)
cd backend
npm install
npm run seed     # genera los JSON con roles, permisos y el usuario admin
npm run dev

# Terminal 2 — frontend (http://localhost:5173)
cd frontend
npm install
npm run dev
```

Vite redirige `/api` al backend (puerto 4000), así que el cliente usa rutas relativas.

Credenciales por defecto (creadas por `npm run seed`): **admin@talleraeg.com / Admin123!**

## Convenciones transversales

- **Idioma:** la interfaz visible está en español; los identificadores de código (variables,
  funciones, archivos) en inglés.
- **Marca / colores:** azul marino `#16285C` (`navy`) y naranja `#E8551C` (`orange`), definidos como
  escalas en `frontend/tailwind.config.js`. El logo es `Propuesta 2.png` (copiado a
  `frontend/public/logo.png`).
- Cada subproyecto tiene su propio `CLAUDE.md` con los detalles de arquitectura y comandos.
