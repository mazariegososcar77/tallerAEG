# Frontend Taller AEG — build de Vite servido por nginx
# Las imagenes base se jalan de mirror.gcr.io (espejo gratuito de Docker Hub) y no
# de docker.io directo: los runners de GitHub comparten IP y Docker Hub los limita/
# tumba con 429/504 seguido. mirror.gcr.io sirve la misma imagen, sin login.
# --- Etapa 1: build de la SPA ---
FROM mirror.gcr.io/library/node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# --- Etapa 2: servir el build con nginx ---
FROM mirror.gcr.io/library/nginx:1.27-alpine

# Config de nginx: sirve la SPA y hace proxy de /api al backend
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Archivos estáticos compilados
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
