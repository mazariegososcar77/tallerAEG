# Notificaciones por correo — integración con n8n

El sistema **no manda correos**. Decide *qué* avisar, *a quién* y con *qué texto* (HTML y texto plano
ya redactados) y hace un `POST` al webhook de n8n. Del otro lado hay **un solo workflow**, que recibe
y envía. n8n nunca le pregunta nada al sistema: no hay endpoints expuestos hacia afuera ni claves de
integración.

La URL del webhook y el resto de la configuración se editan en la app, en
**Configuración → Notificaciones**.

## El flujo en n8n

```
Webhook (POST)  →  Datos (Set)  →  IF ¿lleva PDF?  ─┬─ sí →  Convert to File  →  Enviar correo (con adjunto)
                                                     └─ no →  Enviar correo
```

**Webhook:** método `POST`, path `correo`, sin autenticación, *Respond:* **Immediately**.

Lo de *Respond: Immediately* importa: el sistema corta a los 10 segundos y da el envío por fallido.
Si n8n esperara a que salga el correo antes de contestar, un SMTP lento haría que el sistema crea que
falló y lo reintente.

**Ojo con el anidado:** en el nodo Webhook el cuerpo del POST llega bajo `body`. Las expresiones son
`{{ $json.body.subject }}`, no `{{ $json.subject }}`. Por eso conviene el nodo Set, que lo aplana:

| Campo del Set | Valor |
|---|---|
| `evento` | `{{ $json.body.event }}` |
| `para` | `{{ $json.body.to }}` |
| `asunto` | `{{ $json.body.subject }}` |
| `html` | `{{ $json.body.html }}` |
| `texto` | `{{ $json.body.text }}` |
| `adjunto_nombre` | `{{ $json.body.adjunto_nombre }}` |
| `adjunto_base64` | `{{ $json.body.adjunto_base64 }}` |

**IF:** String → *is equal to*, `{{ $json.evento }}` contra `quote_email`.

**Convert to File** (solo rama `true`): operación *Convert Base64 String to File*, campo de entrada
`adjunto_base64`, salida en `data`, nombre `{{ $json.adjunto_nombre }}`, MIME `application/pdf`.
Si después de este nodo los campos de texto salen vacíos, refiérelos al Set por nombre:
`{{ $('Datos').item.json.asunto }}`.

**Send an Email:** *To* `{{ $json.para }}`, *Subject* `{{ $json.asunto }}`, formato HTML,
*HTML* `{{ $json.html }}`. En la rama del PDF, además *Attachments* → `data`.

## Qué campos trae cada aviso

Todos traen `event`, `sent_at`, `to` (correos separados por coma), `subject`, `html` y `text`.

| `event` | Cuándo sale | Campos extra |
|---|---|---|
| `low_stock` | revisión diaria | `count` |
| `maintenance_due` | revisión diaria | `count` |
| `quote_expiring` | revisión diaria | `count` |
| `work_order_created` | al crear una orden | `work_order` (objeto: `id`, `number`, `client_name`, `status`) |
| `quote_email` | botón "Enviar por correo" | `adjunto_nombre`, `adjunto_tipo`, `adjunto_base64`, `cotizacion_numero`, `cliente` |
| `test` | botón "Enviar prueba" | — |

## Probar desde Postman

`POST` a la URL del webhook, header `Content-Type: application/json`, body **raw / JSON**, y pega uno
de los archivos de [`ejemplos/`](ejemplos/). Son capturas **reales** de lo que manda el sistema,
generadas desde el propio código, no escritas a mano.

| Archivo | Notas |
|---|---|
| `test.json` | el más simple, para armar el flujo |
| `low_stock.json` | 3 artículos bajo su punto de reorden |
| `maintenance_due.json` | 1 vencido + 1 próximo (los vencidos van primero) |
| `quote_expiring.json` | 1 cotización por vencer |
| `work_order_created.json` | incluye el objeto `work_order` |
| `quote_email-minimo.json` | **empieza por este** para la rama del PDF: 2 KB, con un PDF chico pero válido |
| `quote_email.json` | el real: 265 KB, con el PDF completo de una cotización |

Para probar contra n8n en modo edición usa la URL `webhook-test` con *Listen for test event*; la de
producción es la misma sin `-test`, y exige el workflow **Activo**.

Sin Postman también se puede: los botones **"Enviar prueba"** y **"Revisar ahora"** de la pantalla de
Configuración disparan lo mismo con datos reales.

## Detalles del comportamiento

- **Si n8n no responde o devuelve error**, el aviso *no* se marca como enviado. Los diarios se
  reintentan solos en la revisión siguiente; el de la cotización muestra el error en pantalla.
- **No se repite lo mismo:** `notifications_log` recuerda lo avisado — 24 h para stock y
  cotizaciones, 7 días para mantenimientos. Por eso "Revisar ahora" se puede apretar sin miedo.
- **`quote_email` pesa ~265 KB** por el PDF en base64. El grueso es el logo del membrete; si algún
  día estorba, el logo es lo que hay que aligerar.

Documentación técnica en [backend/CLAUDE.md](../../backend/CLAUDE.md), sección *Notificaciones
automaticas (n8n)*.
