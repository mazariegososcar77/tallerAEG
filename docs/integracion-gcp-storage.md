# Integración de Google Cloud Storage (imágenes, fotos y firmas)

Guía paso a paso para mover el almacenamiento de archivos de **Taller AEG** desde el disco de la VM
(`backend/uploads/`, volumen Docker `backend_uploads`) a **Google Cloud Storage (GCS)**.

## Decisiones tomadas (contexto de esta guía)

| Tema | Decisión | Implicación |
|------|----------|-------------|
| Servicio | **Cloud Storage** (bucket de objetos) | No se usa disco de VM ni Filestore. Durable, respaldado, escalable. |
| Acceso | **Bucket privado + URLs firmadas V4** | Nadie accede sin una URL firmada temporal que emite el backend. |
| PDFs | **Se siguen generando al vuelo** | Solo migran **imágenes de artículo, fotos de reporte y firmas**. El PDF baja las fotos del bucket para incrustarlas. |
| Autenticación | **Archivo de llave JSON referenciado desde `.env`** (camino principal) | Config en `.env`; la llave firma URLs sin llamadas extra. Alternativa keyless documentada al final. |

### ¿Por qué privado + URLs firmadas?

El sistema maneja datos de clientes, fotos de equipos y facturas. Un bucket privado no expone nada:
el backend, al devolver cada registro, reemplaza la "llave" del objeto (ej. `articles/uuid.jpg`) por
una **URL firmada** `https://storage.googleapis.com/...?X-Goog-Signature=...` que **expira** (ej. 6 h).
Como el frontend siempre trae los datos frescos desde la API en cada carga, la expiración no molesta.

---

## Qué cambia en el código actual (mapa)

Hoy el flujo es:

- **Subida:** `backend/src/middleware/upload.middleware.js` — multer `diskStorage` escribe en
  `UPLOADS_DIR` (`backend/uploads/`).
- **Se guarda en BD** la ruta `/uploads/<uuid>.ext`:
  - `backend/src/controllers/articleController.js:39` (imagen de artículo)
  - `backend/src/services/workReportService.js:71` (foto de reporte) y `:94` (firma)
- **Se sirve** con `express.static` en `backend/src/app.js:23` (`/api/uploads`).
- **PDF** lee del disco para incrustar: `backend/src/utils/pdfGenerator.js:536` y `:568`.
- **Frontend** usa el valor tal cual como `src` (`ImagePicker`, `ArticleViewModal`,
  `PhotoStageGallery`, `SignaturePad`) → con URLs firmadas absolutas **funciona sin cambios**.

Después de migrar:

- Multer pasa a **memoria** (buffer), y un módulo nuevo `src/lib/gcs.js` sube el buffer al bucket.
- En BD se guarda la **llave del objeto** (`articles/uuid.jpg`), no `/uploads/...`.
- Al **devolver** registros, un helper firma la llave → URL temporal.
- El PDF **descarga** el buffer del bucket en vez de leer disco.

---

# PARTE A — En GCP (consola o `gcloud`)

> Reemplazá los placeholders: `PROJECT_ID`, `talleraeg-archivos` (bucket, debe ser único global),
> `us-central1` (región cercana a tu VM), `talleraeg-storage` (cuenta de servicio).

### A1. Seleccionar proyecto y habilitar APIs

```bash
gcloud config set project PROJECT_ID

gcloud services enable \
  storage.googleapis.com \
  iamcredentials.googleapis.com   # necesaria SOLO si luego usás el modo keyless (Parte F)
```

### A2. Crear el bucket (privado)

```bash
gcloud storage buckets create gs://talleraeg-archivos \
  --project=PROJECT_ID \
  --location=us-central1 \
  --uniform-bucket-level-access \
  --public-access-prevention
```

- `--uniform-bucket-level-access`: permisos por IAM (no ACLs por objeto). Recomendado.
- `--public-access-prevention`: bloquea que el bucket se vuelva público por error.

(Opcional) Ciclo de vida para versiones/temporales, o versioning para conservar históricos:

```bash
gcloud storage buckets update gs://talleraeg-archivos --versioning
```

### A3. Crear la cuenta de servicio del backend

```bash
gcloud iam service-accounts create talleraeg-storage \
  --display-name="Taller AEG - acceso a Cloud Storage"
```

Su correo queda como:
`talleraeg-storage@PROJECT_ID.iam.gserviceaccount.com`

### A4. Darle permiso SOLO sobre este bucket (mínimo privilegio)

```bash
gcloud storage buckets add-iam-policy-binding gs://talleraeg-archivos \
  --member="serviceAccount:talleraeg-storage@PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/storage.objectAdmin"
```

`objectAdmin` permite leer, subir y borrar objetos del bucket (no administrar el bucket en sí).

### A5. Crear la llave JSON (camino principal — firma de URLs offline)

```bash
gcloud iam service-accounts keys create gcs-key.json \
  --iam-account="talleraeg-storage@PROJECT_ID.iam.gserviceaccount.com"
```

Esto descarga `gcs-key.json`. **Es un secreto**: no lo subas a git, no lo compartas. Lo llevás a la
VM en la Parte B. (Si preferís no manejar llaves, mirá la **Parte F** — modo keyless.)

### A6. (Opcional) CORS del bucket

Para mostrar imágenes en `<img>` **no hace falta CORS**. Solo si en el futuro el navegador hiciera
`fetch`/`canvas` sobre el archivo. Si lo necesitás:

```bash
cat > cors.json <<'EOF'
[{ "origin": ["https://TU-DOMINIO"], "method": ["GET"], "responseHeader": ["Content-Type"], "maxAgeSeconds": 3600 }]
EOF
gcloud storage buckets update gs://talleraeg-archivos --cors-file=cors.json
```

---

# PARTE B — En la VM de GCP

### B1. Colocar la llave de forma segura

Copiá `gcs-key.json` a la VM (por `scp`, o pegándolo con un editor). Guardalo **fuera del repo**,
por ejemplo en `/opt/talleraeg/secrets/gcs-key.json`, con permisos restringidos:

```bash
sudo mkdir -p /opt/talleraeg/secrets
sudo mv gcs-key.json /opt/talleraeg/secrets/
sudo chmod 600 /opt/talleraeg/secrets/gcs-key.json
```

### B2. Variables de entorno del backend (`backend/.env`)

Agregá al `.env` del backend:

```dotenv
# --- Google Cloud Storage ---
GCS_BUCKET=talleraeg-archivos
GCP_PROJECT_ID=PROJECT_ID
GOOGLE_APPLICATION_CREDENTIALS=/opt/talleraeg/secrets/gcs-key.json
SIGNED_URL_TTL_MIN=360          # minutos de validez de cada URL firmada (6 h)
```

> **Respondiendo tu duda del `.env`:** la autenticación no es una contraseña dentro del `.env`. Lo que
> va en `.env` es la **ruta** a la llave (`GOOGLE_APPLICATION_CREDENTIALS`) más el bucket y el proyecto.
> La librería `@google-cloud/storage` lee esa ruta automáticamente. La llave JSON en sí vive como
> archivo en la VM (Parte B1), nunca pegada como texto en el `.env`.

### B3. Docker Compose — pasar env y montar la llave

En `docker/docker-compose.yml`, servicio `backend`, agregá las variables y monta la llave como
volumen de solo lectura:

```yaml
  backend:
    # ...
    environment:
      # ... lo que ya tenías ...
      GCS_BUCKET: ${GCS_BUCKET}
      GCP_PROJECT_ID: ${GCP_PROJECT_ID}
      GOOGLE_APPLICATION_CREDENTIALS: /secrets/gcs-key.json
      SIGNED_URL_TTL_MIN: ${SIGNED_URL_TTL_MIN:-360}
    volumes:
      - backend_uploads:/app/uploads                       # dejalo hasta migrar los viejos
      - /opt/talleraeg/secrets/gcs-key.json:/secrets/gcs-key.json:ro   # <-- nuevo
```

Y en el `.env` que consume docker-compose (el de la carpeta `docker/`) agregá `GCS_BUCKET`,
`GCP_PROJECT_ID` y `SIGNED_URL_TTL_MIN`.

### B4. Verificar acceso desde la VM

```bash
gcloud storage ls gs://talleraeg-archivos        # debe responder sin error (aunque esté vacío)
echo "prueba" > /tmp/t.txt
gcloud storage cp /tmp/t.txt gs://talleraeg-archivos/pruebas/t.txt
gcloud storage rm gs://talleraeg-archivos/pruebas/t.txt
```

---

# PARTE C — Cambios en la aplicación (backend)

### C1. Instalar la librería

```bash
cd backend
npm install @google-cloud/storage
```

### C2. Módulo nuevo: `backend/src/lib/gcs.js`

```js
// Cliente de Cloud Storage + helpers de subida, firma y descarga.
import { Storage } from '@google-cloud/storage';

const bucketName = process.env.GCS_BUCKET;
const ttlMin = Number(process.env.SIGNED_URL_TTL_MIN || 360);

// Con GOOGLE_APPLICATION_CREDENTIALS apuntando a la llave, esto se autoconfigura.
const storage = new Storage({ projectId: process.env.GCP_PROJECT_ID });
const bucket = storage.bucket(bucketName);

/** Sube un buffer y devuelve la LLAVE del objeto (lo que se guarda en BD). */
export async function uploadBuffer(key, buffer, contentType) {
  await bucket.file(key).save(buffer, {
    contentType,
    resumable: false,
    metadata: { cacheControl: 'private, max-age=0' },
  });
  return key;
}

/** Descarga un objeto como Buffer (para incrustar en PDFs). */
export async function downloadBuffer(key) {
  const [buf] = await bucket.file(key).download();
  return buf;
}

/** Borra un objeto (ignora si no existe). */
export async function deleteObject(key) {
  await bucket.file(key).delete({ ignoreNotFound: true });
}

/**
 * Devuelve una URL de lectura firmada y temporal para una llave.
 * Si `value` ya es una URL http(s) externa (el usuario pegó una URL en
 * ImagePicker) o está vacía, se devuelve tal cual.
 */
export async function signedReadUrl(value) {
  if (!value) return value;
  if (/^https?:\/\//i.test(value)) return value;            // URL externa: no firmar
  const key = value.replace(/^\/?uploads\//, '');           // tolera valores legacy /uploads/xxx
  const [url] = await bucket.file(key).getSignedUrl({
    version: 'v4',
    action: 'read',
    expires: Date.now() + ttlMin * 60 * 1000,
  });
  return url;
}
```

### C3. Multer a memoria — `backend/src/middleware/upload.middleware.js`

Cambiá `multer.diskStorage(...)` por memoria (el resto de validaciones/tamaño quedan igual):

```js
// Antes: const storage = multer.diskStorage({ ... });
const storage = multer.memoryStorage();
```

Ya **no** se necesitan `UPLOADS_DIR`, `fs.mkdirSync`, ni la lógica de `filename`. Dejá los `fileFilter`
y `limits`. Los buffers llegan en `req.file.buffer` con `req.file.mimetype` y `req.file.originalname`.

### C4. Subir a GCS y guardar la llave

**Imagen de artículo** — `backend/src/controllers/articleController.js` (reemplaza líneas 35–41):

```js
import crypto from 'crypto';
import * as gcs from '../lib/gcs.js';

export const uploadImage = asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No se recibio imagen' });
  const ext = (req.file.originalname.match(/\.(jpg|jpeg|png|webp|gif)$/i)?.[0] || '.bin').toLowerCase();
  const key = `articles/${crypto.randomUUID()}${ext}`;
  await gcs.uploadBuffer(key, req.file.buffer, req.file.mimetype);
  res.status(201).json({ url: key });   // el frontend lo guarda tal cual en image_url
});
```

**Foto y firma de reporte** — `backend/src/services/workReportService.js`:

- En `addPhoto` (línea ~71), reemplazá el bloque `const photoUrl = '/uploads/' + file.filename;`:

  ```js
  const ext = (file.originalname.match(/\.(jpg|jpeg|png|webp|gif)$/i)?.[0] || '.bin').toLowerCase();
  const key = `work-reports/${crypto.randomUUID()}${ext}`;
  await gcs.uploadBuffer(key, file.buffer, file.mimetype);
  return workReportRepository.addPhoto(id, { stage, photo_url: key, caption, sort_order: sortOrder });
  ```

- En `setSignature` (línea ~94), igual pero con prefijo `signatures/`:

  ```js
  const key = `signatures/${crypto.randomUUID()}.png`;
  await gcs.uploadBuffer(key, file.buffer, file.mimetype);
  const url = key;
  ```

(Agregá `import crypto from 'crypto';` y `import * as gcs from '../lib/gcs.js';` arriba.)

### C5. Firmar al devolver los registros (lectura)

Donde el backend serializa lo que va al frontend, convertí la llave en URL firmada. Puntos clave:

- **Artículos**: en `articleService` (la función que arma el objeto público, tipo `toPublic`),
  después de armar el registro:
  ```js
  article.image_url = await gcs.signedReadUrl(article.image_url);
  ```
  Como firmar es asíncrono, si mapeás una lista usá `await Promise.all(list.map(async a => ...))`.

- **Reportes de trabajo**: al devolver un reporte (`getById`) firmá `photo_url` de cada foto y
  `tech_signature_url` / `client_signature_url`:
  ```js
  report.tech_signature_url = await gcs.signedReadUrl(report.tech_signature_url);
  report.client_signature_url = await gcs.signedReadUrl(report.client_signature_url);
  report.photos = await Promise.all(
    report.photos.map(async p => ({ ...p, photo_url: await gcs.signedReadUrl(p.photo_url) }))
  );
  ```

> Regla: **en BD siempre la llave; en la respuesta HTTP siempre la URL firmada.** El helper ignora
> las URLs externas pegadas a mano, así que ese caso sigue funcionando.

### C6. PDF: descargar del bucket en vez de leer disco

En `backend/src/utils/pdfGenerator.js`, las fotos y firmas del reporte se incrustan leyendo del disco
(`join(UPLOADS_DIR, ...)`). Ahora hay que **descargar el buffer** del bucket. Como `doc.image()`
acepta un `Buffer`, la vía más limpia es **pre-descargar** todos los buffers antes de dibujar:

```js
import * as gcs from '../lib/gcs.js';

// Antes de dibujar las etapas/firmas, junta las llaves y descárgalas:
const keys = [
  ...report.photos.map(p => p.photo_url),
  report.tech_signature_url,
  report.client_signature_url,
].filter(k => k && !/^https?:\/\//i.test(k));

const buffers = new Map();
await Promise.all(keys.map(async k => {
  try { buffers.set(k, await gcs.downloadBuffer(k.replace(/^\/?uploads\//, ''))); } catch {}
}));
```

Y en el dibujo (líneas ~536 y ~568) reemplazá el `filePath` por el buffer:

```js
// Foto de etapa:
const buf = buffers.get(p.photo_url);
if (buf) doc.image(buf, x, y, { fit: [THUMB, THUMB], align: 'center', valign: 'center' });
else doc.rect(x, y, THUMB, THUMB).fill('#f1f5f9');

// Firma:
const buf = buffers.get(url);
if (buf) doc.image(buf, x + 5, y + 5, { fit: [sigW - 10, sigH - 10], align: 'center', valign: 'center' });
```

> Nota: `generarReportePDF` debe ser `async` (ya suele serlo porque produce un stream). Si hoy es
> síncrona, envolvé la parte de fetch con `await` antes de construir el documento.

### C7. Limpiar el servido estático

En `backend/src/app.js:23`, la línea `app.use('/api/uploads', express.static(UPLOADS_DIR));` ya no
sirve los archivos de GCS. **Dejala temporalmente** si todavía hay archivos viejos en el volumen (hasta
terminar la Parte D); una vez migrados, se puede quitar junto con el volumen `backend_uploads`.

### C8. (Opcional) Borrado en cascada

Cuando se borra un artículo o una foto, borrá también el objeto en GCS con `gcs.deleteObject(key)`
(en el service correspondiente). No es obligatorio, pero evita objetos huérfanos.

---

# PARTE D — Migrar los archivos que ya existen

Los archivos actuales están en el volumen `backend_uploads` y en BD como `/uploads/<archivo>`.

### D1. Subir los archivos al bucket

Desde la VM, con el contenedor detenido o copiando el contenido del volumen:

```bash
# ubicá la ruta real del volumen o copia desde el contenedor:
docker cp talleraeg_backend:/app/uploads ./uploads-backup

# subí todo bajo un prefijo (ej. lo dejamos como articles/ y work-reports/ según corresponda,
# o de forma simple todo bajo "legacy/"):
gcloud storage cp -r ./uploads-backup/* gs://talleraeg-archivos/legacy/
```

### D2. Actualizar la BD

Reemplazá `/uploads/<x>` por la llave nueva (`legacy/<x>`) en las 3 columnas:

```sql
UPDATE articles         SET image_url          = REPLACE(image_url,          '/uploads/', 'legacy/') WHERE image_url          LIKE '/uploads/%';
UPDATE work_report_photos SET photo_url        = REPLACE(photo_url,          '/uploads/', 'legacy/') WHERE photo_url          LIKE '/uploads/%';
UPDATE work_reports     SET tech_signature_url = REPLACE(tech_signature_url, '/uploads/', 'legacy/') WHERE tech_signature_url LIKE '/uploads/%';
UPDATE work_reports     SET client_signature_url = REPLACE(client_signature_url, '/uploads/', 'legacy/') WHERE client_signature_url LIKE '/uploads/%';
```

> El helper `signedReadUrl` también tolera valores `/uploads/...` sin migrar (les quita el prefijo),
> pero conviene dejar la BD limpia con las llaves reales.

---

# PARTE E — Verificación y puesta en marcha

1. `docker compose -f docker/docker-compose.yml up -d --build`
2. Subí una imagen nueva de artículo → revisá en la consola de GCS que aparezca en `articles/`.
3. Recargá el artículo → el `<img>` debe cargar desde `storage.googleapis.com/...` (firmada).
4. Creá una foto y firma en un reporte → verificá bucket + descarga del PDF (las fotos deben salir).
5. Revisá que **no** haya errores de permiso (`403`/`Anonymous caller`): suele ser el rol IAM
   (Parte A4) o la ruta de la llave en `.env`.

### Frontend
No requiere cambios: `ImagePicker`, `ArticleViewModal`, `PhotoStageGallery` y `SignaturePad` usan el
valor como `src` directo, y ahora recibirán una URL absoluta firmada. **No** antepongas `/api` a esas
URLs. La opción "Usar URL" de `ImagePicker` (pegar una URL externa) sigue funcionando porque el helper
no firma lo que ya es `http(s)://`.

---

# PARTE F — Alternativa: sin archivo de llave (keyless, más seguro)

Si preferís **no** manejar el `gcs-key.json`, adjuntá la cuenta de servicio a la VM y usá
Application Default Credentials. Requiere pasos extra **porque firmar URLs sin llave necesita la API
de IAM Credentials**:

1. Habilitá `iamcredentials.googleapis.com` (Parte A1).
2. Dale a la propia cuenta de servicio el rol para firmar en su nombre:
   ```bash
   gcloud iam service-accounts add-iam-policy-binding \
     talleraeg-storage@PROJECT_ID.iam.gserviceaccount.com \
     --member="serviceAccount:talleraeg-storage@PROJECT_ID.iam.gserviceaccount.com" \
     --role="roles/iam.serviceAccountTokenCreator"
   ```
3. Adjuntá la cuenta a la VM (requiere apagar la VM para cambiarla):
   ```bash
   gcloud compute instances set-service-account NOMBRE_VM --zone=ZONA \
     --service-account=talleraeg-storage@PROJECT_ID.iam.gserviceaccount.com \
     --scopes=https://www.googleapis.com/auth/cloud-platform
   ```
4. En `.env`: quitá `GOOGLE_APPLICATION_CREDENTIALS` y agregá el correo de la SA para firmar:
   ```dotenv
   GCS_SIGNER_EMAIL=talleraeg-storage@PROJECT_ID.iam.gserviceaccount.com
   ```
5. En `gcs.js`, pasá `signBlob` al construir el cliente:
   ```js
   const storage = new Storage({ projectId: process.env.GCP_PROJECT_ID });
   // getSignedUrl detecta que no hay llave y usa la API de IAM (signBlob) con la SA de la VM.
   ```
   No montés ninguna llave en docker-compose.

> Ventaja: no hay archivo de llave que rotar/fugar. Costo: 1 paso de IAM + apagar la VM una vez +
> depende de que la app corra en esa VM.

---

## Checklist rápido

- [ ] Bucket privado creado (`uniform-bucket-level-access`, `public-access-prevention`).
- [ ] Cuenta de servicio con `roles/storage.objectAdmin` sobre el bucket.
- [ ] Llave JSON en la VM (`chmod 600`) **o** modo keyless (Parte F).
- [ ] `.env` con `GCS_BUCKET`, `GCP_PROJECT_ID`, `GOOGLE_APPLICATION_CREDENTIALS`, `SIGNED_URL_TTL_MIN`.
- [ ] docker-compose: env + montaje de la llave (`:ro`).
- [ ] `npm install @google-cloud/storage`.
- [ ] `src/lib/gcs.js` creado.
- [ ] Multer en memoria; subidas guardan la **llave**; lecturas devuelven **URL firmada**.
- [ ] `pdfGenerator.js` descarga buffers del bucket.
- [ ] Archivos viejos migrados y BD actualizada (Parte D).
- [ ] Probado: subir imagen, foto de reporte, firma y PDF.

---

# ANEXO — Comparación: guardar las fotos en Base64 dentro de la base de datos

Alternativa a Cloud Storage: convertir cada foto a **Base64** y guardarla como texto
(`LONGTEXT`) en MySQL, sin archivos externos. Esta es la comparación de consumo.

### Supuestos (ajustá con tus números reales)

| Parámetro | Valor usado |
|-----------|-------------|
| Límite por archivo (hoy) | 5 MB (`MAX_SIZE_MB` en `upload.middleware.js`) |
| Foto típica de celular (JPEG) | **2 MB** (rango real 1–5 MB) |
| Fotos por reporte | **12** (4 etapas × ~3 fotos) |
| Firmas por reporte | 2 PNG de ~20 KB (despreciable) |
| Imagen de artículo | ~0.5 MB, 1 por artículo |
| Sobrecosto de Base64 | **+33 %** (4 bytes de texto por cada 3 de imagen) |

### 1) Sobrecosto unitario (por el encoding)

| Elemento | Tamaño real (GCS/disco) | En Base64 (BD) | Diferencia |
|----------|-------------------------|----------------|------------|
| 1 foto de 2 MB | 2.0 MB | **2.67 MB** | +0.67 MB |
| 1 reporte (12 fotos + 2 firmas) | ~24 MB | **~32 MB** | +8 MB |
| 1 imagen de artículo (0.5 MB) | 0.5 MB | **0.67 MB** | +0.17 MB |

### 2) Acumulado según volumen del taller

| Escenario | Fotos crudas (GCS/disco) | **Base64 dentro de la BD** |
|-----------|--------------------------|----------------------------|
| Taller chico — 30 reportes/mes | 0.7 GB/mes · **~8.6 GB/año** | 1.0 GB/mes · **~11.5 GB/año** |
| Taller mediano — 80 reportes/mes | 1.9 GB/mes · **~23 GB/año** | 2.6 GB/mes · **~31 GB/año** |

> Es **acumulativo**: la BD nunca "libera" ese espacio, crece mes a mes. En el escenario mediano, en
> ~2 años la base ronda los **60 GB** (contra unos pocos MB si solo guarda llaves/URLs).

### 3. Impacto concreto en la base de datos y la VM

- **La BD deja de ser chica.** Hoy tus tablas pesan MB; con Base64 pasan a pesar **decenas de GB**. El
  volumen Docker `db_data` crece igual, sobre el disco de la misma VM.
- **Backups pesados y lentos.** `mysqldump` incluye TODAS las fotos como texto → cada respaldo pesa
  como toda la base (30+ GB) y tarda; restaurar, igual. Con GCS, el `mysqldump` sigue siendo de MB y
  las fotos se respaldan aparte (versionado del bucket).
- **RAM y tamaño de respuestas.** Devolver un reporte con 12 fotos en Base64 = una respuesta HTTP de
  **~32 MB** (el backend arma ese JSON completo en memoria). Con URLs firmadas, esa misma respuesta
  pesa **~5 KB**. Un listado de reportes se vuelve impensable de traer completo.
- **`max_allowed_packet`.** Hay que subirlo; una consulta que traiga varias fotos puede superar el
  límite y fallar. Cuidado también con `SELECT *`: arrastra los MB de cada fila aunque no los uses.
- **Sin caché de navegador.** Los `data:` URIs van embebidos: no se cachean como archivo, se
  re-descargan en cada carga. Con URLs, el navegador cachea cada imagen por separado.

### 4. Tabla resumen

| Criterio | Cloud Storage (privado + URL firmada) | Base64 en la BD |
|----------|---------------------------------------|-----------------|
| Espacio por foto | Tamaño real | **+33 %** |
| Crecimiento de la BD | Mínimo (solo llaves/URLs) | **Crece en GB, sin techo** |
| Backups (`mysqldump`) | Chicos y rápidos | **Enormes y lentos** |
| RAM / respuestas API | KB por respuesta | **Decenas de MB por reporte** |
| Caché de imágenes | Sí, por archivo | No (inline) |
| Escalado multi-instancia | Nativo | La BD es el cuello de botella |
| Costo | Almacenamiento GCS (barato) + egress | "Gratis" pero infla VM, backup y RAM |
| Simplicidad | Requiere esta integración | **Cero infra: todo en un lugar** |

### 5. Notas

- **BLOB en vez de Base64:** si aun así quisieras todo en la BD, guardar los bytes crudos en
  `LONGBLOB` evita el **+33 %** del Base64 (guardás 2 MB, no 2.67 MB), pero **mantiene todos los demás
  problemas** (BD gigante, backups lentos, RAM). Es un punto medio, no una solución.
- **Cuándo Base64/BD sí tiene sentido:** volúmenes muy chicos (pocas fotos en total), donde la
  simplicidad de "todo en la base, un solo backup, transacción atómica con la fila" pesa más que el
  tamaño. No es el caso de un taller que documenta cada orden con ~12 fotos.

**Conclusión:** para este sistema, Base64 en la BD suma **+33 %** de tamaño y, sobre todo, traslada
**decenas de GB** al motor de base de datos y a cada backup, encareciendo RAM y respuestas. Cloud
Storage mantiene la BD liviana y mueve el peso a un servicio pensado para archivos.
