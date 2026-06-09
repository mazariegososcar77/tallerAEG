# Frontend Taller AEG — build de Vite servido por nginx
# --- Etapa 1: build de la SPA ---
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# --- Etapa 2: servir el build con nginx ---
FROM nginx:1.27-alpine

# Config de nginx: sirve la SPA y hace proxy de /api al backend
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Archivos estáticos compilados
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
