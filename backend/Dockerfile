# Backend Taller AEG — API Node.js + Express
# La imagen base se jala de mirror.gcr.io (espejo gratuito de Docker Hub) y no de
# docker.io directo: los runners de GitHub comparten IP y Docker Hub los limita/
# tumba con 429/504 seguido. mirror.gcr.io sirve la misma imagen, sin login.
FROM mirror.gcr.io/library/node:20-alpine

# ffmpeg/ffprobe: comprimen el video final de un reporte de trabajo al subirlo
# (ver src/lib/mediaProcessing.js) -- la VM de produccion tiene poca RAM libre
# y sin swap, asi que nunca se guarda un video sin comprimir.
RUN apk add --no-cache ffmpeg

WORKDIR /app

# Instalar dependencias primero (mejor caché de capas)
COPY package*.json ./
RUN npm ci --omit=dev

# Código fuente
COPY . .

# Carpetas de datos persistentes (se montan como volúmenes en compose)
RUN mkdir -p src/data uploads

ENV NODE_ENV=production
ENV PORT=4000
EXPOSE 4000

# Siembra los datos por defecto (idempotente) y arranca el servidor
CMD ["sh", "-c", "npm run seed && npm start"]
