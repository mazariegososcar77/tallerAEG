# Almacenamiento de archivos en Google Cloud Storage

Cómo quedó implementado el almacenamiento de fotos, firmas, videos y documentos adjuntos de
**Taller AEG**, y cómo se despliega.

> Este documento reemplaza la guía de planificación anterior. Dos cosas cambiaron respecto de aquel
> plan y conviene tenerlas claras porque son las decisiones que ordenan todo lo demás:
> **(1) no hay archivo de llave JSON** — la autenticación es por la service account adjunta a la VM;
> **(2) los archivos no pasan por el backend** — el navegador los sube directo al bucket con una URL
> firmada. El plan viejo pasaba multer a memoria y subía desde Node, que es justo lo que hay que
> evitar con 1.9 GB de RAM.

---

## Punto de partida (lo que había)

Conviene decirlo porque circulaba la idea de que las fotos estaban en base64 dentro de MySQL: **no lo
estaban**. Las columnas de media son `VARCHAR(500)` y guardaban la ruta `/uploads/<uuid>.<ext>`; los
archivos vivían en el disco del contenedor (volumen Docker `backend_uploads`), servidos por
`express.static`. El trabajo no fue decodificar base64 sino mover un volumen de archivos al bucket y
reescribir el prefijo de esas rutas.

## Cómo funciona ahora

**Al subir** (foto de reporte, firma, imagen de artículo, documento adjunto):

1. El navegador prepara el archivo (`frontend/src/lib/image.js`: lo redibuja en un canvas y lo exporta
   liviano) y le pide permiso al backend: `POST /api/uploads/signed-url` con el tipo y el tamaño.
2. El backend revisa permisos, tipo y tamaño, y devuelve una **URL firmada de subida** (PUT, 10 min) más
   la ruta con la que el archivo va a quedar guardado.
3. El navegador sube el archivo **directo al bucket** con esa URL (`frontend/src/lib/upload.js`).
4. Recién entonces se le manda al backend la **ruta**, que es lo único que se guarda en MySQL.

**Al leer**: el backend convierte esa ruta en una **URL firmada de lectura** (1 hora) en cada respuesta.
En la base nunca se guarda una URL firmada.

**La excepción**: el video final del reporte sigue viajando al backend, porque hay que medirlo con
`ffprobe` y comprimirlo con `ffmpeg` antes de guardarlo. Lo que cambió es el destino: el MP4 ya
comprimido se sube al bucket y los archivos locales se borran, así que el disco de la VM deja de crecer.

### Convención de nombres

```
articulos/2026/08/<uuid>.webp     imagen de un articulo del inventario
reportes/2026/08/<uuid>.jpg       foto de una etapa/categoria del reporte
firmas/2026/08/<uuid>.png         firma dibujada a mano
videos/2026/08/<uuid>.mp4         video final de prueba del reporte
documentos/2026/08/<uuid>.pdf     papeleria de terceros adjunta a una orden
```

- **UUID siempre**, nunca `orden-1234.jpg`: la ruta no se puede adivinar.
- **Partición por año/mes** para poder listar y aplicar reglas de ciclo de vida sin recorrer un
  directorio de decenas de miles de objetos. La fecha sale del registro, no del día de la subida.
- **El entorno no va en la ruta**: lo separa el bucket (`talleraeg-media-prod` / `-dev`).

**Sobre el formato:** la imagen de artículo va en **WebP** y las fotos de reporte en **JPG**. No es un
descuido: `pdfkit` sólo sabe embeber JPEG y PNG, así que una foto de reporte en WebP saldría como un
recuadro gris en el PDF. La imagen de artículo no entra a ningún PDF, por eso ahí sí se usa el formato
más liviano. Las firmas son PNG porque necesitan fondo transparente.

### Lectura dual (lo que permite migrar sin apuro)

`backend/src/lib/mediaUrl.js` entiende las tres formas que puede tener una columna de media, y las tres
seguirán funcionando indefinidamente:

| Valor guardado | Qué se devuelve |
|---|---|
| `/uploads/<archivo>` | igual que siempre (archivo en el disco del servidor) |
| `https://…` | igual (URL externa pegada a mano en `articles.image_url`) |
| `reportes/2026/08/<uuid>.jpg` | URL firmada temporal |

Por eso el código se puede desplegar **antes** de mover un solo archivo: una fila migrada y una sin
migrar se ven idénticas desde el frontend.

---

## Archivos que cambiaron

**Backend**

| Archivo | Qué hace |
|---|---|
| `src/lib/gcsStorage.js` | Único punto que habla con GCS: firmar lectura/subida, subir, borrar, bajar a temporal. Cliente singleton y **caché de URLs firmadas** (sin llave local, cada firma es una llamada de red a IAM: sin caché, abrir un reporte de 30 fotos serían 30 llamadas). |
| `src/lib/mediaUrl.js` | Lectura dual y preparación de archivos locales para los PDF. |
| `src/services/uploadService.js` | Reglas de qué se puede subir, con qué permiso y hasta qué tamaño; emite la URL firmada. |
| `src/routes/uploadRoutes.js`, `src/controllers/uploadController.js` | `POST /api/uploads/signed-url`. |
| `src/middleware/upload.middleware.js` | `soloSiEsMultipart()`: deja pasar el JSON con la ruta del objeto sin romper la subida multipart de siempre. |
| `workReportService`, `serviceOrderService`, `workOrderDocumentService`, `articleService` | Aceptan `object_path` además del archivo; borran el objeto del bucket al eliminar una foto/documento o reemplazar una firma. |
| `src/utils/pdfGenerator.js` | Recibe un mapa de archivos ya bajados en vez de leer siempre del disco. |
| `scripts/migrate-uploads-to-gcs.mjs` | Migración de los archivos que ya existen. |

**Frontend**

| Archivo | Qué hace |
|---|---|
| `src/lib/upload.js` | Pide la URL firmada y sube con `XMLHttpRequest` (progreso real, y **sin** la cabecera `Authorization` que Google rechazaría). |
| `src/lib/image.js` | `prepareImageForUpload(file, 'webp' \| 'jpg')`. |
| `src/api/*.js` | Cada subida intenta el camino directo y cae al multipart si el bucket no está configurado. |
| `src/lib/pdf.js` | No manda el token cuando la URL es externa (una firmada de Google). |
| `ImagePicker`, `PhotoStageGallery`, `WorkOrderDocumentsModal` | Indicador de progreso; el `ImagePicker` distingue el valor guardado de la vista previa. |

### Dos trampas que ya están resueltas (no las reintroduzcas)

1. **Nunca devuelvas la URL firmada en el mismo campo que el formulario reenvía al guardar.** El
   formulario de artículo manda `image_url` de vuelta y el de orden de servicio manda la orden entera:
   si el GET hubiera devuelto la URL firmada en esos campos, guardar habría escrito esa URL temporal en
   MySQL y la imagen se vería rota al vencer. Por eso `articles` expone `image_display_url` aparte, y
   `serviceOrderService.update` descarta las firmas (que sólo se cambian por su propio endpoint).
2. **El interceptor de Axios le pega `Authorization` a todo.** Contra una URL firmada, Google responde
   error ("solo se permite un mecanismo de autenticación"). Las subidas usan XHR crudo y `fetchPdfBlob`
   omite el token para URLs absolutas.

---

## Configuración

La **única** variable nueva es el nombre del bucket. No hay llave JSON, no hay
`GOOGLE_APPLICATION_CREDENTIALS`, no hay secretos nuevos en GitHub Actions y el workflow de CI/CD **no
se toca**: la VM tiene adjunta la service account `talleraeg-storage`, así que `@google-cloud/storage`
obtiene credenciales por ADC (metadata server) y firma las URLs vía IAM `signBlob`.

En el `.env` de cada entorno en la VM (`/home/oscar/tallerAEG/docker/.env` para prod,
`/home/oscar/tallerAEG-dev/docker/.env` para dev):

```dotenv
GCS_BUCKET=talleraeg-media-prod    # dev: talleraeg-media-dev
```

En una máquina de desarrollo, el equivalente de las credenciales de la VM es:

```bash
gcloud auth application-default login
```

Si `GCS_BUCKET` queda vacío, todo el sistema sigue guardando en el disco del servidor exactamente como
antes. Es lo que permite trabajar sin credenciales de Google.

---

## Rollout

### 1. Dev primero

```bash
# 1. Agregar la variable y desplegar (push a developer dispara el CI/CD)
echo 'GCS_BUCKET=talleraeg-media-dev' >> /home/oscar/tallerAEG-dev/docker/.env

# 2. Verificar que el backend puede firmar (dentro del contenedor)
docker compose -p talleraeg-dev exec backend node -e "
  import('@google-cloud/storage').then(async ({Storage}) => {
    const [url] = await new Storage().bucket('talleraeg-media-dev').file('prueba.txt')
      .getSignedUrl({version:'v4', action:'read', expires: Date.now()+60000});
    console.log('firma OK:', url.slice(0, 80));
  });
"
```

Probar en `dev.centrodeservicioaeg.com`: subir una foto de artículo, una foto de reporte, una firma, un
documento adjunto y el video; descargar el PDF del reporte y confirmar que las fotos salen impresas.

### 2. Migrar los archivos que ya existen

**Antes de nada, respaldo.** El script no borra nada, pero la base sí se modifica:

```bash
docker compose -p talleraeg-dev exec db mysqldump -u root -p talleraeg > respaldo-dev.sql
```

Copiar los archivos del volumen a tu máquina (el script está pensado para correr **fuera de la VM**):

```bash
# En la VM
docker run --rm -v talleraeg-dev_backend_uploads:/u -v $PWD:/out alpine \
  tar czf /out/uploads-dev.tar.gz -C /u .
# En tu maquina
scp usuario@VM:~/uploads-dev.tar.gz .  &&  mkdir uploads-dev  &&  tar xzf uploads-dev.tar.gz -C uploads-dev
```

Abrir el túnel a MySQL y correr primero en simulación:

```bash
ssh -L 3306:localhost:3308 usuario@VM        # 3308 = dev, 3307 = prod

cd backend
GCS_BUCKET=talleraeg-media-dev UPLOADS_DIR=../uploads-dev \
DB_HOST=127.0.0.1 DB_PORT=3306 DB_NAME=talleraeg DB_USER=aeg_user DB_PASSWORD=... \
node scripts/migrate-uploads-to-gcs.mjs --dry-run
```

Revisar el `.log` que deja, y si se ve bien, correrlo sin `--dry-run`. El script procesa en lotes de 50,
es reanudable (pagina por id, no por offset) e idempotente (conserva el UUID del archivo, así que la
misma fila siempre produce el mismo objeto). Una fila con problemas se anota y no corta el proceso.

Se puede acotar con `--tabla=work_report_photos` y `--limite=100` para probar de a poco.

### 3. Producción

Lo mismo, en este orden: respaldo (`mysqldump`) → `GCS_BUCKET=talleraeg-media-prod` en el `.env` →
desplegar `main` → verificar subiendo algo nuevo → migrar los archivos viejos.

### 4. Limpieza — semanas después, y sólo con autorización expresa

Mientras quede una sola fila apuntando a `/uploads/`, **no** se toca nada. Cuando el siguiente conteo dé
cero en todas las columnas y hayan pasado varias semanas de uso normal:

```sql
SELECT 'articles' t, COUNT(*) n FROM articles WHERE image_url LIKE '/uploads/%'
UNION ALL SELECT 'wr_photos', COUNT(*) FROM work_report_photos WHERE photo_url LIKE '/uploads/%'
UNION ALL SELECT 'wr_firma_tec', COUNT(*) FROM work_reports WHERE tech_signature_url LIKE '/uploads/%'
UNION ALL SELECT 'wr_firma_cli', COUNT(*) FROM work_reports WHERE client_signature_url LIKE '/uploads/%'
UNION ALL SELECT 'wr_video', COUNT(*) FROM work_reports WHERE final_video_url LIKE '/uploads/%'
UNION ALL SELECT 'so_firma_tec', COUNT(*) FROM service_orders WHERE tech_signature_url LIKE '/uploads/%'
UNION ALL SELECT 'so_firma_cli', COUNT(*) FROM service_orders WHERE client_signature_url LIKE '/uploads/%'
UNION ALL SELECT 'documentos', COUNT(*) FROM work_order_documents WHERE file_url LIKE '/uploads/%';
```

Recién entonces se puede vaciar el volumen `backend_uploads` (y sólo el contenido: el volumen se sigue
usando como carpeta temporal de ffmpeg).

### Volver atrás

Los archivos originales siguen en el volumen, así que el rollback de una migración es un `UPDATE` que
restaure el prefijo:

```sql
UPDATE work_report_photos
   SET photo_url = CONCAT('/uploads/', SUBSTRING_INDEX(photo_url, '/', -1))
 WHERE photo_url LIKE 'reportes/%';
```

Y para desactivar la nube por completo: vaciar `GCS_BUCKET` y redesplegar. El sistema vuelve a guardar
en disco; lo que ya se subió al bucket seguirá viéndose mientras la variable esté puesta, así que esto
sirve como interruptor de emergencia sólo si todavía no se migró nada.

---

## Pendientes conocidos

- **Objetos huérfanos.** Si el navegador pide una URL firmada, sube el archivo y falla justo al guardar
  el registro, queda un objeto en el bucket que nadie referencia. Conviene una regla de ciclo de vida en
  el bucket, o un script de limpieza que compare el bucket contra la base. Hoy no existe ninguno de los
  dos.
- **El video sigue pasando por Node y ffmpeg sigue corriendo en la VM.** Es el proceso que más RAM
  consume del sistema. Sacarlo de la VM (subida directa del crudo + transcodificación en un Cloud Run
  job) es una decisión aparte, con infraestructura nueva.
- **La compresión de fotos del servidor (`sharp`) ya no actúa** en el camino directo al bucket: la
  conversión del navegador pasó a ser el único paso. Sigue vigente como red de seguridad únicamente en
  el camino multipart (sin `GCS_BUCKET`).
