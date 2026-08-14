# Pendiente 1 — Facturación y certificación FEL (Digifact)

> Hallazgos de la revisión del módulo de Facturación y de la integración con Digifact
> (rama `Misa`, 2026-08-09). Ordenados por impacto: **1–4 tocan datos fiscales**,
> **5–7 son funcionalidad faltante**, **8 es texto engañoso en pantalla**.

---

## 1. `fel_certified_at` nunca se llena

**Dónde:** [invoiceService.certify()](../backend/src/services/invoiceService.js) (líneas ~126-133)

`certify()` actualiza `status`, `client_email` y los cuatro campos `fel_*`
(`fel_certifier`, `fel_uuid`, `fel_series`, `fel_number`), pero **no escribe
`fel_certified_at`**. La columna existe en [019_invoices.sql](../backend/migraciones/019_invoices.sql)
y siempre queda `NULL`.

**Por qué importa:** no hay forma de saber *cuándo* se certificó una factura. La SAT y
el contador piden la fecha de certificación, y `created_at` no sirve (es la fecha de
generación de la factura, que puede ser días antes).

**Arreglo:** agregar `fel_certified_at: new Date()` al objeto que se le pasa a
`invoiceRepository.update(id, {...})`.

**Esfuerzo:** 1 línea.

---

## 2. `work_orders.dte_number` no se actualiza al certificar

**Dónde:** [invoiceService.js](../backend/src/services/invoiceService.js) — el
comentario de `createFromWorkReport()` (líneas ~81-84) lo dice explícitamente:

> *"el día que felCertifier deje de ser un stub, certify() debe repetir esta misma
> actualización con el número fiscal real (fel_number)"*

Hoy `createFromWorkReport()` escribe el **número interno** de la factura en
`work_orders.dte_number`, y `certify()` **no repite esa actualización** con el número
fiscal real que devuelve Digifact.

**Por qué importa:** la orden de trabajo se queda apuntando al correlativo interno
(`0007`) en vez del número de DTE real. Ese campo existe justamente para amarrar la
orden con la factura fiscal — que era lo que antes se anotaba a mano en el talonario.

**Arreglo:** en `certify()`, después del `update` de la factura, si `fel.fel_number`
viene lleno, hacer
`workOrderRepository.update(invoice.work_order_id, { dte_number: fel.fel_number })`.

**Esfuerzo:** 3-4 líneas (requiere importar `workOrderRepository`, ya está importado).

---

## 3. El estado pasa a `certificada` aunque no haya credenciales

**Dónde:** [invoiceService.certify()](../backend/src/services/invoiceService.js) +
[felCertifier.js](../backend/src/services/felCertifier.js)

Cuando faltan las credenciales de Digifact, `felCertifier.certify()` devuelve todo
`null` (comportamiento stub, correcto y a propósito), pero `invoiceService.certify()`
igual pone `status = 'certificada'`.

**Por qué importa:** en la lista de facturas, una marcada como "Certificada" puede ser
fiscal o **no serlo**, y el único dato que las distingue es si `fel_uuid` viene lleno.
Nada en la UI lo hace evidente — el PDF sí avisa (banda ámbar), la pantalla no.

**Nota:** el comportamiento actual es **intencional** (uso administrativo del taller
mientras no hay credenciales). Lo que falta no es cambiar el estado, es hacerlo visible.

**Arreglo sugerido:** en [InvoicesPage.jsx](../frontend/src/pages/billing/InvoicesPage.jsx),
distinguir visualmente `certificada + fel_uuid != null` (verde, "Certificada FEL") de
`certificada + fel_uuid == null` (ámbar/gris, "Certificada — sin FEL"). Alternativa más
estricta: un tercer estado real en el enum.

**Esfuerzo:** bajo si es solo UI; medio si se agrega estado a la BD (migración nueva).

---

## 4. Todas las líneas se declaran como "Servicio" ante la SAT

**Dónde:** [nucBuilder.js](../backend/src/lib/nucBuilder.js) (líneas ~114, 121, 124)

```js
const isBien = item.item_type === 'bien';
```

La tabla `invoice_items` ([019_invoices.sql](../backend/migraciones/019_invoices.sql))
**no tiene columna `item_type`**, así que esa comparación siempre da `false`. Resultado:
todo se manda con `Type: 'Servicio'` y `UnitOfMeasure: 'SER'`, incluidos los repuestos.

**Por qué importa:** es una declaración fiscal. Los repuestos son bienes, no servicios.
Está documentado como supuesto en el encabezado del archivo, pero **debería validarlo el
contador** antes de facturar en producción.

**Arreglo:** la información existe río arriba — `quote_items.item_type` ya distingue
`labor`/`part`. Falta:
1. Migración nueva que agregue `item_type ENUM('bien','servicio')` a `invoice_items`.
2. Que `createFromWorkReport()` copie ese dato al mapear desde `quote_items`
   (`part` → `bien`, `labor` → `servicio`).
3. El `nucBuilder` ya está listo, no se toca.

**Esfuerzo:** medio (migración + 2 archivos). **Confirmar primero con el contador.**

---

## 5. `invoice.tipo_dte` y `invoice.moneda` no existen

**Dónde:** [nucBuilder.js](../backend/src/lib/nucBuilder.js) (líneas ~136-138)

```js
DocType: invoice.tipo_dte || 'FACT',
Currency: invoice.moneda || 'GTQ',
```

Ninguna de esas dos columnas existe en la tabla `invoices`, así que **siempre** cae al
default. Hoy es inofensivo (el taller solo emite FACT en quetzales), pero es código que
aparenta ser configurable y no lo es.

**Arreglo:** o se agregan las columnas (si algún día se emiten notas de crédito / FCAM /
otra moneda), o se quita el `invoice.X ||` y se dejan las constantes con un comentario
que diga por qué son fijas. **Lo segundo es lo honesto hoy.**

**Esfuerzo:** trivial (opción B).

---

## 6. No hay envío de correo

**Dónde:** todo el backend — no hay `nodemailer` ni configuración SMTP.

El frontend captura el correo del cliente en
[CertifyInvoiceModal.jsx](../frontend/src/pages/billing/CertifyInvoiceModal.jsx) y se
guarda en `invoices.client_email`, pero **no se envía nada**. La columna `email_sent_at`
existe en la tabla y nada la escribe nunca.

**Por qué importa:** el usuario escribe un correo esperando que la factura llegue ahí.
Hoy hay que descargar el PDF y mandarlo a mano.

**Arreglo:** integrar SMTP (nodemailer) + una plantilla de correo con el PDF adjunto, y
llenar `email_sent_at`. Requiere decidir qué cuenta de correo usa el taller.

**Esfuerzo:** alto (feature nueva, requiere credenciales SMTP).

---

## 7. No hay anulación de facturas

**Dónde:** [digifactClient.cancelDte()](../backend/src/lib/digifactClient.js) (líneas ~124-136)

La función está implementada (recibe `authNumber`, `idReceptor`, fecha original y
motivo), y el estado `anulada` existe en el enum de `invoices.status` — pero **no hay
endpoint, ni service, ni botón**. No hay forma de llegar a ese estado desde la app.

También queda sin usar `getDteInfo()` (consultar el estado de un DTE ya certificado).

**Por qué importa:** una factura mal emitida no se puede corregir desde el sistema. Ante
la SAT hay que anular, y hoy eso solo se puede hacer por fuera (portal de Digifact).

**Arreglo:** `POST /invoices/:id/cancel` con permiso propio (`billing.cancel`, nuevo en
migración), motivo obligatorio, que llame a `cancelDte()` y ponga `status='anulada'`.

**Esfuerzo:** medio (endpoint + permiso + UI + migración de permiso).

---

## 8. Textos desactualizados que le mienten al usuario

**Dónde:**
- [CertifyInvoiceModal.jsx](../frontend/src/pages/billing/CertifyInvoiceModal.jsx)
  — encabezado del archivo y el aviso ámbar visible en pantalla (líneas ~5-8 y ~70-74)
- [invoicesApi.js](../frontend/src/api/invoicesApi.js) — comentario de `certify` (línea 7)
- [InvoicesPage.jsx](../frontend/src/pages/billing/InvoicesPage.jsx) — comentario de
  encabezado (línea ~10)
- [invoiceService.js](../backend/src/services/invoiceService.js) — el JSDoc de `certify()`
  (líneas ~108-117) todavía dice *"hoy felCertifier es un simulador que no está conectado
  a ningún proveedor real"*
- [invoiceRoutes.js](../backend/src/routes/invoiceRoutes.js) — el `summary` de Swagger de
  `/invoices/{id}/certify` dice *"certificación FEL real pendiente de integrar"*

Todos dicen que la certificación FEL **no está integrada**. Ya lo está (Digifact,
commits `01c8c08` → `2062203` → `b6f4787` → `9301f54`). Lo que sigue pendiente son las
**credenciales**, que es algo distinto.

**Por qué importa:** el aviso miente en la dirección contraria a la peligrosa. Si mañana
alguien pone credenciales reales, la pantalla va a seguir diciendo "esto no es una
factura fiscal" mientras certifica facturas de verdad ante la SAT.

**Arreglo:** reescribir el aviso para que refleje la condición real, idealmente
**condicional**: el backend puede exponer si Digifact está configurado (p. ej. en
`GET /invoices` o en un endpoint de estado) y el modal mostrar el aviso **solo cuando no
lo esté**, con un texto tipo *"No hay credenciales de Digifact configuradas: esta factura
se marcará como certificada solo para control interno y no llevará UUID fiscal."*

**Esfuerzo:** bajo si es solo texto; medio si se hace condicional (recomendado).

---

## Resumen

| # | Tema | Tipo | Esfuerzo | Bloquea producción |
|---|------|------|----------|--------------------|
| 1 | `fel_certified_at` sin llenar | Bug | Trivial | Sí (dato fiscal) |
| 2 | `dte_number` sin actualizar | Bug | Trivial | Sí (trazabilidad) |
| 3 | "Certificada" ambiguo en UI | UX / riesgo | Bajo-medio | Sí |
| 4 | Todo se declara "Servicio" | Fiscal | Medio | **Sí — validar con contador** |
| 5 | `tipo_dte`/`moneda` fantasma | Limpieza | Trivial | No |
| 6 | Sin envío de correo | Feature | Alto | No |
| 7 | Sin anulación | Feature | Medio | No (workaround: portal Digifact) |
| 8 | Textos desactualizados | Doc / UX | Bajo-medio | Sí |

**Antes de poner credenciales reales de Digifact**, cerrar como mínimo 1, 2, 4 y 8, y
confirmar con Digifact/el contador: régimen de IVA (`AfiliacionIVA`), Frase y Escenario
del NIT, y el establecimiento. Probar primero con `DIGIFACT_ENV=test`.
