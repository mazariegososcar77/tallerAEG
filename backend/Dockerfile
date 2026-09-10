# Backend Taller AEG — API Node.js + Express
FROM node:20-alpine

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
