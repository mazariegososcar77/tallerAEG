/**
 * En palabras simples: este archivo es el que "dibuja" y arma los
 * documentos PDF que la gente descarga desde el sistema: la cotizacion, la
 * orden de trabajo, la factura y el reporte de trabajo. Cada funcion
 * `generar...PDF` recibe los datos de un registro (por ejemplo una
 * cotizacion) y devuelve el documento PDF ya armado, con el logo, colores
 * y formato de Taller AEG.
 *
 * El codigo de cada funcion tiene mucha repeticion porque va posicionando
 * cajas y texto punto por punto (coordenadas x/y) para que el PDF se vea
 * ordenado; no hace falta entender cada linea, solo las secciones grandes
 * marcadas con comentarios (encabezado, datos del cliente, tabla de items,
 * totales, pie de pagina, firmas).
 */
import PDFDocument from 'pdfkit';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { UPLOADS_DIR } from '../middleware/upload.middleware.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Junta el PDF en memoria en vez de mandarlo a la respuesta HTTP.
 *
 * Las funciones `generar...PDF` devuelven un documento de pdfkit pensado para
 * hacerle `.pipe(res)` y que el navegador lo descargue. Cuando el PDF hay que
 * ADJUNTARLO a un correo no hay a donde canalizarlo, asi que se recogen los
 * pedazos y se devuelven como un solo Buffer. Ojo: llama a `doc.end()` por
 * dentro, asi que quien la use no debe llamarlo tambien.
 */
export function pdfABuffer(doc) {
  return new Promise((resolve, reject) => {
    const pedazos = [];
    doc.on('data', (p) => pedazos.push(p));
    doc.on('end', () => resolve(Buffer.concat(pedazos)));
    doc.on('error', reject);
    doc.end();
  });
}
// Colores de marca de Taller AEG usados en todos los PDF (azul marino,
// naranja) y algunos tonos neutros de apoyo (gris, negro, blanco).
const AZUL = '#0C1733';
const AZUL_MED = '#16285C';
const NARANJA = '#E8551C';
const GRIS = '#64748b';
const NEGRO = '#1e293b';
const BLANCO = '#ffffff';

// ── DATOS DEL TALLER ──────────────────────────────────────────────────
// Todos los generadores reciben como segundo parametro la configuracion del
// sistema (`settings`, de services/settingsService.js) para imprimir el nombre,
// direccion y telefono reales del taller — antes estaban escritos a mano aqui,
// con un telefono de relleno ("0000-0000"). Se editan en la pantalla
// Configuracion > Configuracion general.
//
// Estos valores de respaldo son los que estaban escritos a mano antes: si a un
// generador no se le pasa la configuracion, el PDF sale igual que siempre en vez
// de salir con campos vacios.
const EMPRESA_FALLBACK = {
  company_name: 'CENTRO DE SERVICIO AEG',
  company_tagline: 'CENTRO DE SERVICIOS INDUSTRIALES',
  company_slogan: 'Desde el año 2000, solidez, innovación y servicio',
  company_address: 'Guatemala, Guatemala',
  company_phone: '(+502) 5502-5055',
  company_email: '',
  company_nit: '',
  quote_valid_days: 15,
};

const empresa = (settings) => ({ ...EMPRESA_FALLBACK, ...(settings || {}) });

// ── ARCHIVOS QUE SE EMBEBEN EN EL PDF ─────────────────────────────────
/**
 * Devuelve la ruta EN DISCO de una foto o firma, que es lo unico que `pdfkit`
 * sabe embeber (no sabe abrir una URL).
 *
 * `locales` es el mapa que arma `lib/mediaUrl.js#prepararLocales` antes de
 * llamar al generador: trae ya bajadas a un temporal las imagenes que viven en
 * Google Cloud Storage, y resueltas contra la carpeta de siempre las que aun
 * viven en el disco del servidor. Si un archivo no esta (se borro, fallo la
 * bajada), se devuelve null y quien dibuja pinta el recuadro gris de siempre en
 * vez de romper el PDF entero.
 */
function archivoLocal(valor, locales) {
  if (!valor) return null;
  if (locales && locales.has(valor)) return locales.get(valor);
  if (typeof valor === 'string' && valor.startsWith('/uploads/')) {
    return join(UPLOADS_DIR, valor.replace('/uploads/', ''));
  }
  return null;
}

// Dibuja el bloque de datos del taller dentro de la banda azul del encabezado
// (la misma en los 5 PDF). Los datos vacios simplemente no se imprimen, y las
// lineas se van acomodando hacia abajo segun cuantos haya.
function dibujarDatosEmpresa(doc, cfg, x = 160) {
  doc.fillColor(BLANCO).fontSize(18).font('Helvetica-Bold').text(cfg.company_name, x, 20);
  doc.fontSize(9).font('Helvetica');
  let y = 42;
  const linea = (texto) => {
    if (!texto) return;
    doc.text(texto, x, y);
    y += 13;
  };
  linea(cfg.company_tagline);
  linea(cfg.company_address);
  linea([
    cfg.company_phone && 'Tel: ' + cfg.company_phone,
    cfg.company_nit && 'NIT: ' + cfg.company_nit,
  ].filter(Boolean).join('   '));
  linea(cfg.company_email);
}

// Texto del taller que va en la esquina derecha del pie de pagina.
const pieEmpresa = (cfg) =>
  [cfg.company_name, cfg.company_address].filter(Boolean).join(' — ');

// Arma el PDF de una COTIZACION: muestra los datos del cliente, la lista
// de equipos con su mano de obra y repuestos cotizados, y los totales
// (subtotal, descuento, total). Es el documento que se le entrega al
// cliente antes de aceptar el trabajo.
export function generarCotizacionPDF(quote, settings, { conDescuento = false } = {}) {
  const cfg = empresa(settings);
  const doc = new PDFDocument({ size: 'A4', margin: 0, autoFirstPage: true });
  const W = doc.page.width;
  const L = 40;
  const R = W - 40;
  const CW = R - L;

  // ── HEADER ──────────────────────────────────────────────
  doc.rect(0, 0, W, 110).fill(AZUL);

  try {
    const logoPath = join(__dirname, '../assets/logo.jpeg');
    doc.image(logoPath, L, 15, { height: 75 });
  } catch(e) {}

  dibujarDatosEmpresa(doc, cfg);

  doc.fontSize(22).font('Helvetica-Bold').fillColor(NARANJA)
     .text('COTIZACION', 350, 18, { width: 200, align: 'right' });
  doc.fontSize(12).font('Helvetica').fillColor(BLANCO)
     .text('No. ' + (quote.number || '0001'), 350, 48, { width: 200, align: 'right' });

  const fechaDoc = quote.date ? new Date(quote.date).toLocaleDateString('es-GT') : '-';
  const validaDoc = quote.valid_until ? new Date(quote.valid_until).toLocaleDateString('es-GT') : '-';
  doc.fontSize(8).fillColor('#94a3b8')
     .text('Fecha: ' + fechaDoc, 350, 68, { width: 200, align: 'right' })
     .text('Valida hasta: ' + validaDoc, 350, 80, { width: 200, align: 'right' });

  let y = 122;

  // ── DATOS DEL CLIENTE ────────────────────────────────────
  doc.rect(L, y, CW, 20).fill(AZUL_MED);
  doc.fillColor(BLANCO).fontSize(9).font('Helvetica-Bold')
     .text('DATOS DEL CLIENTE', L + 8, y + 6);
  y += 26;

  doc.fillColor(NEGRO).fontSize(9).font('Helvetica-Bold').text('Cliente:', L, y);
  doc.font('Helvetica').text(quote.client_name || '-', L + 55, y);
  y += 14;

  if (quote.work_type) {
    doc.font('Helvetica-Bold').text('Trabajo:', L, y);
    doc.font('Helvetica').text(quote.work_type, L + 55, y);
    y += 14;
  }
  if (quote.observations) {
    doc.font('Helvetica-Bold').text('Observaciones:', L, y);
    doc.font('Helvetica').text(quote.observations, L + 95, y, { width: CW - 95 });
    y += 14;
  }
  y += 10;

  // ── EQUIPOS ──────────────────────────────────────────────
  const equipments = quote.equipment_data || [];
  const items = quote.items || [];

  equipments.forEach((eq, ei) => {
    if (y > 680) { doc.addPage({ margin: 0 }); y = 40; }

    doc.rect(L, y, CW, 20).fill(NARANJA);
    const eqTitle = eq.name || ('Equipo ' + (ei + 1));
    const eqSub = [eq.brand, eq.model, eq.serial].filter(Boolean).join(' - ');
    doc.fillColor(BLANCO).fontSize(9).font('Helvetica-Bold')
       .text(eqTitle + (eqSub ? '   |   ' + eqSub : ''), L + 8, y + 6, { width: CW - 16 });
    y += 24;

    const laborItems = items.filter(i => i.equipment_index === ei && i.item_type === 'labor');
    if (laborItems.length > 0) {
      doc.rect(L, y, CW, 17).fill('#1e3a5f');
      doc.fillColor(BLANCO).fontSize(8).font('Helvetica-Bold')
         .text('MANO DE OBRA', L + 8, y + 5)
         .text('CANT.', R - 175, y + 5, { width: 45, align: 'center' })
         .text('PRECIO UNIT.', R - 125, y + 5, { width: 65, align: 'right' })
         .text('SUBTOTAL', R - 55, y + 5, { width: 55, align: 'right' });
      y += 19;
      laborItems.forEach((item, idx) => {
        doc.rect(L, y, CW, 15).fill(idx % 2 === 0 ? '#f1f5f9' : BLANCO);
        doc.fillColor(NEGRO).fontSize(8).font('Helvetica')
           .text(item.description || '-', L + 8, y + 4, { width: CW - 220 })
           .text(Number(item.quantity).toFixed(2), R - 175, y + 4, { width: 45, align: 'center' })
           .text('Q ' + Number(item.unit_price).toFixed(2), R - 125, y + 4, { width: 65, align: 'right' })
           .text('Q ' + Number(item.subtotal).toFixed(2), R - 55, y + 4, { width: 55, align: 'right' });
        y += 16;
      });
    }

    const partItems = items.filter(i => i.equipment_index === ei && i.item_type === 'part');
    if (partItems.length > 0) {
      y += 3;
      doc.rect(L, y, CW, 17).fill('#1a4731');
      doc.fillColor(BLANCO).fontSize(8).font('Helvetica-Bold')
         .text('REPUESTOS', L + 8, y + 5)
         .text('CANT.', R - 175, y + 5, { width: 45, align: 'center' })
         .text('PRECIO UNIT.', R - 125, y + 5, { width: 65, align: 'right' })
         .text('SUBTOTAL', R - 55, y + 5, { width: 55, align: 'right' });
      y += 19;
      partItems.forEach((item, idx) => {
        doc.rect(L, y, CW, 15).fill(idx % 2 === 0 ? '#f0fdf4' : BLANCO);
        const sinStock = Number(item.unit_price) === 0;
        doc.fillColor(sinStock ? '#94a3b8' : NEGRO).fontSize(8).font('Helvetica')
           .text((item.description || '-') + (sinStock ? ' (sin precio)' : ''), L + 8, y + 4, { width: CW - 220 })
           .text(Number(item.quantity).toFixed(2), R - 175, y + 4, { width: 45, align: 'center' })
           .text(sinStock ? '-' : 'Q ' + Number(item.unit_price).toFixed(2), R - 125, y + 4, { width: 65, align: 'right' })
           .text(sinStock ? '-' : 'Q ' + Number(item.subtotal).toFixed(2), R - 55, y + 4, { width: 55, align: 'right' });
        y += 16;
      });
    }

    const eqSubtotal = [...laborItems, ...partItems].reduce((s, i) => s + Number(i.subtotal), 0);
    doc.rect(L, y, CW, 17).fill('#f1f5f9');
    doc.fillColor(GRIS).fontSize(8).font('Helvetica-Bold')
       .text('Subtotal equipo:', R - 175, y + 5, { width: 120, align: 'right' })
       .text('Q ' + eqSubtotal.toFixed(2), R - 55, y + 5, { width: 55, align: 'right' });
    y += 22;
  });

  // ── TOTALES ──────────────────────────────────────────────
  if (y > 700) { doc.addPage({ margin: 0 }); y = 40; }
  y += 6;
  doc.moveTo(L, y).lineTo(R, y).strokeColor('#e2e8f0').stroke();
  y += 10;

  // "Sin descuento" (el valor por defecto) imprime la cotizacion a precio completo:
  // sin la linea de descuento y con el total igual al subtotal. Solo es de
  // presentacion -- el descuento sigue guardado tal cual en la cotizacion.
  const subtotal = Number(quote.subtotal) || 0;
  const discount = conDescuento ? (Number(quote.discount) || 0) : 0;
  const total = conDescuento ? (Number(quote.total) || 0) : subtotal;

  doc.fillColor(NEGRO).fontSize(9).font('Helvetica')
     .text('Subtotal:', R - 180, y, { width: 125, align: 'right' })
     .text('Q ' + subtotal.toFixed(2), R - 50, y, { width: 50, align: 'right' });
  y += 16;

  if (discount > 0) {
    doc.text('Descuento:', R - 180, y, { width: 125, align: 'right' })
       .text('- Q ' + discount.toFixed(2), R - 50, y, { width: 50, align: 'right' });
    y += 16;
  }

  doc.rect(R - 200, y, 200, 26).fill(NARANJA);
  doc.fillColor(BLANCO).fontSize(11).font('Helvetica-Bold')
     .text('TOTAL:', R - 200, y + 8, { width: 140, align: 'right' })
     .text('Q ' + total.toFixed(2), R - 55, y + 8, { width: 55, align: 'right' });
  y += 36;

  // ── PIE DE PÁGINA ─────────────────────────────────────────
  const pageH = doc.page.height;
  doc.rect(0, pageH - 38, W, 38).fill(AZUL);
  doc.fillColor('#94a3b8').fontSize(7).font('Helvetica')
     .text('Esta cotizacion tiene validez de ' + cfg.quote_valid_days + ' dias a partir de la fecha de emision.', L, pageH - 28, { width: CW / 2 })
     .text(pieEmpresa(cfg), R - 150, pageH - 28, { width: 150, align: 'right' });
  doc.fillColor(NARANJA).fontSize(8).font('Helvetica-Bold')
     .text(cfg.company_slogan, L, pageH - 15, { width: CW, align: 'center' });

  return doc;
}

// Arma el PDF de una ORDEN DE TRABAJO: el talonario fisico A.E.G., campo por campo
// y en el mismo orden del papel (ver frontend/src/lib/workOrderTalonario.js, que es
// la misma definicion del lado de la pantalla). Muestra solo lo que esta marcado o
// lleno. A proposito NO muestra precios (eso es del modulo de Cotizaciones/
// Facturacion) — ver nota en backend/CLAUDE.md: aqui nunca se lee
// torno_price/parts_price/labor_price.
const TALONARIO_WORK = [
  ['rebobinado', 'Rebobinado'], ['cambio_conexion', 'Cambio conexión'], ['calculo_voltaje', 'Cálculo de voltaje'],
  ['mantenimiento', 'Mantenimiento'], ['extraccion_humedad', 'Extracción de humedad'],
];
const TALONARIO_LODO = [['extraccion_lodo_8m3', 'Extracción de lodo 8 mts³'], ['extraccion_lodo_12m3', 'Extracción de lodo 12 mts³']];
const EQUIPMENT_LABELS = {
  motor_trifasico: 'Motor trifásico', motor_monofasico: 'Motor monofásico', motor_ventilador: 'Motor ventilador',
  motor_reductor: 'Motor reductor', bomba_sumergible: 'Bomba sumergible', bomba_centrifuga: 'Bomba centrífuga',
  blower: 'Blower', generador: 'Generador',
};
const AIREADOR_LABELS = { '1.5Kw': '1.5 Kw', '2Hp': '2Hp', '2.2Kw': '2.2 Kw', '3Hp': '3Hp', '3.7Kw': '3.7 Kw', '5Hp': '5Hp' };
const LEGACY_EQUIPMENT = {
  'motor:trifasico': 'motor_trifasico', 'motor:monofasico': 'motor_monofasico', 'motor:ventilador': 'motor_ventilador',
  'motor:reductor': 'motor_reductor', 'bomba:sumergible': 'bomba_sumergible', 'bomba:centrifuga': 'bomba_centrifuga',
};
const PUMP_SEAL_TYPE_LABELS = { viton: 'Vitón', nitrilo: 'Nitrilo', conico: 'Cónico' };
const PHYSICAL_PART_LABELS = { variador: 'Variador', estator: 'Estator', rotor: 'Rotor', otros: 'Otros' };
const SCREW_ROWS = [
  ['Motor', 'Tornillos de motor'], ['Tolva', 'Tornillos de tolva'], ['Caja de conexión', 'Tornillos de caja de conexión'],
  ['Tapa de conexión', 'Tornillos de tapa de conexión'], ['Bornera', 'Tornillos de bornera'], ['Bomba', 'Tornillos de bomba'],
  ['Retén cojinete delantero', 'Tornillos Reten. coj. delantero'], ['Retén cojinete trasero', 'Tornillos Reten. coj. trasero'],
  ['Impulsor', 'Tornillo Impulsor'], ['Turbina', 'Tornillo Turbina'], ['Castigadores de polea', 'Castigadores de polea'],
  ['Roldanas tornillo impulsor', 'Roldanas tornillo impulsor'], ['Tuercas', 'Tuercas'], ['Washas', 'Washas'],
];
const MEASUREMENT_LINE_FIELDS = [
  ['insulation', 'Medición de aislamiento'],
  ['ohms', 'Medición de OHMS'],
  ['amperage', 'Medición de amperaje'],
];

// Acepta el tipo de equipo en el formato nuevo (casillas) o en el viejo (categoria + subtipos).
function etiquetasEquipo(et, extra = {}) {
  const e = et && typeof et === 'object' ? et : {};
  const tipos = [];
  let aireadores = Array.isArray(e.aireador_sizes) ? e.aireador_sizes : [];
  let turbinaKw = e.turbina_kw || '';
  if ('category' in e) {
    if (e.category === 'blower') tipos.push('blower');
    if (e.category === 'generador') tipos.push('generador');
    for (const s of e.subtypes || []) if (LEGACY_EQUIPMENT[`${e.category}:${s}`]) tipos.push(LEGACY_EQUIPMENT[`${e.category}:${s}`]);
    aireadores = e.category === 'aireador' && e.aireador_size ? [e.aireador_size] : [];
    if (e.category !== 'turbina') turbinaKw = '';
  } else {
    tipos.push(...(Array.isArray(e.subtypes) ? e.subtypes : []));
  }
  return {
    tipos: tipos.map((t) => extra[t] || EQUIPMENT_LABELS[t] || t),
    aireadores: aireadores.map((a) => AIREADOR_LABELS[a] || a),
    turbinaKw, turbinaHp: e.turbina_hp || '',
  };
}
// Conexion y temperatura: tres cajas (L1/L2/L3) en el formato nuevo, un solo texto en el viejo.
const triple = (v) => (v && typeof v === 'object' ? v : { l1: v || '', l2: '', l3: '' });

const ESTADOS_ORDEN_TRABAJO = {
  recibido: 'Recibido', en_proceso: 'En Proceso', listo: 'Listo', entregado: 'Entregado',
  garantia: 'Garantía', devolucion: 'Devolución',
  // Estados de la Orden de Servicio (que usa este mismo formato).
  programada: 'Programada', completada: 'Completada', cancelada: 'Cancelada',
};

// La Orden de Trabajo y la Orden de Servicio comparten el mismo formulario (el talonario
// fisico), asi que comparten este PDF. La de Servicio ademas imprime las firmas
// capturadas en pantalla (`firmas`) y su propio titulo/pie.
// `tiposEquipo`: mapa codigo -> nombre de los tipos de equipo del catalogo (los creados desde
// Configuracion no estan en la lista fija de aqui abajo).
export function generarOrdenTrabajoPDF(order, settings, tiposEquipo = {}) {
  return armarTalonarioPDF(order, settings, { titulo: 'ORDEN DE TRABAJO', pie: 'Orden de Trabajo', tiposEquipo });
}

export function generarOrdenServicioPDF(order, settings, locales = null, tiposEquipo = {}) {
  return armarTalonarioPDF(order, settings, { titulo: 'ORDEN DE SERVICIO', pie: 'Orden de Servicio', firmas: true, locales, tiposEquipo });
}

function armarTalonarioPDF(order, settings, { titulo, pie, firmas = false, locales = null, tiposEquipo = {} }) {
  const cfg = empresa(settings);
  const doc = new PDFDocument({ size: 'A4', margin: 0, autoFirstPage: true });
  const W = doc.page.width;
  const L = 40;
  const R = W - 40;
  const CW = R - L;
  const col2 = L + CW / 2;

  const ensureSpace = (needed) => {
    if (y + needed > doc.page.height - 50) { doc.addPage({ margin: 0 }); y = 40; }
  };
  const sectionHeader = (title, color = AZUL_MED) => {
    ensureSpace(26);
    doc.rect(L, y, CW, 20).fill(color);
    doc.fillColor(BLANCO).fontSize(9).font('Helvetica-Bold').text(title, L + 8, y + 6);
    y += 26;
  };
  const field = (label, value, x, labelW) => {
    doc.fillColor(NEGRO).fontSize(9).font('Helvetica-Bold').text(label, x, y);
    doc.font('Helvetica').text(value || '-', x + labelW, y, { width: CW / 2 - labelW - 10 });
  };
  // Una fila con dos campos (izquierda / derecha); la fila solo se imprime si alguno tiene dato.
  const fila = (a, b, labelWA = 110, labelWB = 110) => {
    if (!a[1] && !(b && b[1])) return;
    ensureSpace(14);
    field(a[0], a[1], L, labelWA);
    if (b) field(b[0], b[1], col2, labelWB);
    y += 14;
  };
  const threeColList = (items) => {
    if (!items.length) return;
    const cols3 = Math.floor(CW / 3);
    ensureSpace(Math.ceil(items.length / 3) * 14);
    items.forEach((label, idx) => {
      const col = idx % 3;
      const px = L + col * cols3;
      doc.fillColor(NEGRO).fontSize(8).font('Helvetica').text('- ' + label, px, y, { width: cols3 - 10 });
      if (col === 2 || idx === items.length - 1) y += 14;
    });
  };
  const yesNo = (v) => (v === 'si' ? 'Sí' : v === 'no' ? 'No' : null);
  const marcados = (lista, valores) => lista.filter(([k]) => valores.includes(k)).map(([, label]) => label);

  // ── ENCABEZADO ───────────────────────────────────────────
  doc.rect(0, 0, W, 110).fill(AZUL);
  try {
    const logoPath = join(__dirname, '../assets/logo.jpeg');
    doc.image(logoPath, L, 15, { height: 75 });
  } catch(e) {}

  dibujarDatosEmpresa(doc, cfg);

  doc.fontSize(22).font('Helvetica-Bold').fillColor(NARANJA)
     .text(titulo, 270, 18, { width: 280, align: 'right' });
  doc.fontSize(12).font('Helvetica').fillColor(BLANCO)
     .text('No. ' + (order.number || '0001'), 350, 48, { width: 200, align: 'right' });

  const fechaRecibido = order.received_at ? new Date(order.received_at).toLocaleDateString('es-GT') : '-';
  const fechaEntrega = order.delivery_at ? new Date(order.delivery_at).toLocaleDateString('es-GT') : '-';
  doc.fontSize(8).fillColor('#94a3b8')
     .text('Recibido: ' + fechaRecibido, 350, 68, { width: 200, align: 'right' })
     .text('Entrega: ' + fechaEntrega, 350, 80, { width: 200, align: 'right' });

  let y = 122;

  const statusLabel = ESTADOS_ORDEN_TRABAJO[order.status] || order.status || '-';
  const fechaProximo = order.next_service_at ? new Date(order.next_service_at).toLocaleDateString('es-GT') : null;

  // ── DATOS GENERALES (encabezado del talonario) ───────────
  sectionHeader('INFORMACION GENERAL');
  field('Cliente:', order.client_name, L, 60);
  field('Estado:', statusLabel, col2, 50);
  y += 14;
  fila(['Código:', order.code, ], ['Proyecto:', order.project], 60, 60);
  fila(['Autorizado por:', order.authorized_by], ['Próximo servicio:', fechaProximo], 90, 100);
  y += 6;

  // ── TRABAJO A REALIZAR (+ aireadores, turbina y tipo de equipo) ──
  sectionHeader('TRABAJO A REALIZAR', NARANJA);
  const workTypes = Array.isArray(order.work_types) ? order.work_types : [];
  threeColList(marcados(TALONARIO_WORK, workTypes));
  const eq = etiquetasEquipo(order.equipment_type, tiposEquipo);
  if (eq.aireadores.length) fila(['Aireadores:', eq.aireadores.join(', ')], null, 75);
  fila(['Turbina Kw:', eq.turbinaKw], ['Turbina Hp:', eq.turbinaHp], 75, 75);
  if (eq.tipos.length) {
    ensureSpace(14);
    doc.fillColor(NEGRO).fontSize(9).font('Helvetica-Bold').text('Tipo de equipo:', L, y);
    y += 14;
    threeColList(eq.tipos);
  }
  y += 6;

  // ── FISICO / TORNO ───────────────────────────────────────
  sectionHeader('FÍSICO / TORNO', NARANJA);
  const physicalParts = Array.isArray(order.physical_parts) ? order.physical_parts : [];
  threeColList(physicalParts.map((p) => PHYSICAL_PART_LABELS[p] || p));
  fila(['Cambio cojinetes No.:', order.bearings_count], ['Cojinetes medida 1 (mm):', order.bearings_mm], 115, 125);
  fila(['Cojinetes medida 2 (mm):', order.bearings_mm_2], ['Retenedores No.:', order.retainers_count], 125, 100);
  fila(['Torno:', order.lathe_note], ['Rectificar eje (mm):', order.shaft_rectify_mm], 45, 115);
  fila(['Tapa delantera (mm):', order.front_cover_mm], ['Tapa trasera (mm):', order.rear_cover_mm], 115, 105);
  fila(['HP:', order.lathe_hp], ['KW:', order.lathe_kw], 30, 30);
  fila(['Camisa sello (mm):', order.seal_liner_mm], ['Perforación ventilador (mm):', order.fan_hole_mm], 105, 145);
  fila(['Otros:', order.physical_other], null, 45);
  const lodo = marcados(TALONARIO_LODO, workTypes);
  if (lodo.length) { y += 4; threeColList(lodo); }
  y += 6;

  // ── DATOS DEL EQUIPO ──────────────────────────────────────
  sectionHeader('DATOS DEL EQUIPO');
  fila(['HP:', order.hp], ['Kw:', order.kw], 30, 30);
  fila(['Volt.:', order.voltage], ['Amp.:', order.amperage], 40, 40);
  fila(['Marca:', order.brand], ['RPM:', order.rpm], 45, 40);
  fila(['Modelo:', order.model], ['Frame:', order.frame], 50, 45);
  fila(['Bomba marca:', order.pump_brand], ['Serie:', order.serial], 80, 40);
  fila(['Impeller:', order.pump_impeller], ['B.M.:', order.pump_bm], 55, 35);
  fila(['Medida de sello:', order.pump_seal_size], ['Tipo de sello:', PUMP_SEAL_TYPE_LABELS[order.pump_seal_type] || order.pump_seal_type], 90, 80);
  if (order.reported_problem) {
    ensureSpace(24);
    doc.fillColor(NEGRO).font('Helvetica-Bold').fontSize(9).text('Falla o problema:', L, y);
    doc.font('Helvetica').text(order.reported_problem, L + 100, y, { width: CW - 100 });
    y += doc.heightOfString(order.reported_problem, { width: CW - 100 }) + 6;
  }
  y += 6;

  // ── MEDICION ─────────────────────────────────────────────
  const drawMeasurementBlock = (title, raw, variant) => {
    const m = raw || {};
    sectionHeader(title, NARANJA);
    doc.fontSize(9);
    const tres = (label, valor) => {
      const t = triple(valor);
      ensureSpace(13);
      doc.fillColor(NEGRO).font('Helvetica-Bold').text(label + ':', L, y, { width: 150 });
      doc.font('Helvetica').text('L1: ' + (t.l1 || '-') + '   L2: ' + (t.l2 || '-') + '   L3: ' + (t.l3 || '-'), L + 150, y, { width: CW - 150 });
      y += 13;
    };
    for (const [key, label] of MEASUREMENT_LINE_FIELDS) tres(label, m[key]);
    ensureSpace(13);
    field('Voltaje aplicado:', m.applied_voltage ? m.applied_voltage + ' V' : null, L, 105);
    field('Medición de tierra:', yesNo(m.ground), col2, 110);
    y += 13;
    tres('Conexión', m.connection);
    tres('Medición de temperatura', m.temperature);
    ensureSpace(13);
    field('Distancia polea:', m.pulley_distance, L, 90);
    field('Distancia acople:', m.coupling_distance, col2, 100);
    y += 13;
    ensureSpace(13);
    if (variant === 'intake') {
      field('Distancia turbina:', m.turbine_distance, L, 100);
      field('Balanceo Rotor:', yesNo(m.balance_rotor), col2, 90);
      y += 13;
      ensureSpace(13);
      field('Balanceo Turbina:', yesNo(m.balance_turbine), L, 100);
      y += 13;
    } else {
      field('Distancia turbina:', m.turbine_distance, L, 100);
      field('Alambre:', m.wire_type === 'ultrashield' ? 'UltraShield' : m.wire_type === 'normal' ? 'Normal' : null, col2, 55);
      y += 13;
    }
    y += 6;
  };
  drawMeasurementBlock('MEDICIÓN COMO INGRESA EQUIPO', order.measurement_intake, 'intake');

  // ── COMPONENTES (partes del equipo recibidas) ─────────────
  const partes = (order.items || []).filter(i => i.has_item);
  if (partes.length > 0) {
    sectionHeader('COMPONENTES RECIBIDOS');
    threeColList(partes.map(p => p.name));
    y += 6;
  }

  // ── TORNILLOS ────────────────────────────────────────────
  sectionHeader('TORNILLOS');
  const screws = Array.isArray(order.screws) ? order.screws : [];
  doc.fontSize(8);
  const scCols = Math.floor(CW / 2);
  SCREW_ROWS.forEach(([part, label], idx) => {
    const row = screws.find(s => s.part === part) || {};
    const col = idx % 2;
    const px = L + col * scCols;
    if (col === 0) ensureSpace(13);
    doc.fillColor(NEGRO).font('Helvetica-Bold').text(label + ':', px, y, { width: scCols - 60 });
    doc.font('Helvetica').text(row.quantity || '-', px + scCols - 55, y, { width: 50 });
    if (col === 1 || idx === SCREW_ROWS.length - 1) y += 13;
  });
  doc.fontSize(9);
  y += 6;

  // ── OBSERVACIONES ──────────────────────────────────────────
  sectionHeader('OBSERVACIONES', NARANJA);
  if (order.observations) {
    ensureSpace(20);
    doc.fillColor(NEGRO).font('Helvetica').fontSize(9).text(order.observations, L, y, { width: CW });
    y += doc.heightOfString(order.observations, { width: CW }) + 6;
  }
  ensureSpace(14);
  doc.fillColor('#ef4444').font('Helvetica-Bold').fontSize(8).text('IMPORTANTE: ', L, y, { continued: true })
     .fillColor(NEGRO).font('Helvetica').text('No nos hacemos responsables por equipos recibidos después de 30 días', { width: CW });
  y += 18;

  drawMeasurementBlock('MEDICIÓN COMO SE ENTREGA EQUIPO', order.measurement_delivery, 'delivery');

  // ── CIERRE ───────────────────────────────────────────────
  sectionHeader('CIERRE');
  field('Técnico A.E.G. desarma:', order.tech_disarm, L, 125);
  field('Técnico A.E.G. arma:', order.tech_assemble, col2, 105);
  y += 14;
  field('Superv. A.E.G. recibe:', order.supervisor_aeg_receive, L, 115);
  field('Superv. cliente entrega:', order.supervisor_client_deliver, col2, 130);
  y += 14;
  field('Superv. A.E.G. entrega:', order.supervisor_aeg_deliver, L, 125);
  field('Superv. cliente recibe:', order.supervisor_client_receive, col2, 125);
  y += 14;
  field('Envío:', order.shipping, L, 40);
  field('Cotización #:', order.quotation_number, col2, 75);
  y += 14;
  field('DTE #:', order.dte_number, L, 45);
  field('O.C. #:', order.oc_number, col2, 45);
  y += 14;
  field('WhatsApp:', order.whatsapp_number, L, 60);
  y += 14;
  y += 6;

  // ── FIRMAS ─────────────────────────────────────────────────
  ensureSpace(firmas ? 120 : 60);
  y += 20;
  if (firmas) {
    const sigW = 200;
    const sigH = 70;
    const dibujar = (x, url, nombre, etiqueta) => {
      doc.rect(x, y, sigW, sigH).lineWidth(0.7).strokeColor('#cbd5e1').stroke();
      const filePath = archivoLocal(url, locales);
      if (filePath) {
        try { doc.image(filePath, x + 5, y + 5, { fit: [sigW - 10, sigH - 10], align: 'center', valign: 'center' }); } catch (e) {}
      }
      doc.fillColor(NEGRO).fontSize(8).font('Helvetica')
         .text(nombre || '_______________________', x, y + sigH + 4, { width: sigW, align: 'center' });
      doc.fillColor(GRIS).fontSize(7).font('Helvetica').text(etiqueta, x, y + sigH + 16, { width: sigW, align: 'center' });
    };
    dibujar(L, order.client_signature_url, order.client_signature_name, 'Firma Cliente');
    dibujar(R - sigW, order.tech_signature_url, order.tech_signature_name, 'Firma Técnico');
  } else {
    doc.moveTo(L, y + 30).lineTo(L + 150, y + 30).strokeColor('#94a3b8').lineWidth(0.5).stroke();
    doc.moveTo(R - 150, y + 30).lineTo(R, y + 30).strokeColor('#94a3b8').lineWidth(0.5).stroke();
    doc.fillColor(GRIS).fontSize(8).font('Helvetica')
       .text('Firma Cliente', L, y + 34, { width: 150, align: 'center' })
       .text('Firma Tecnico', R - 150, y + 34, { width: 150, align: 'center' });
  }

  // ── PIE DE PÁGINA ─────────────────────────────────────────
  const pageH = doc.page.height;
  doc.rect(0, pageH - 38, W, 38).fill(AZUL);
  doc.fillColor('#94a3b8').fontSize(7).font('Helvetica')
     .text(pie + ' - ' + cfg.company_name, L, pageH - 28, { width: CW / 2 })
     .text(pieEmpresa(cfg), R - 150, pageH - 28, { width: 150, align: 'right' });
  doc.fillColor(NARANJA).fontSize(8).font('Helvetica-Bold')
     .text(cfg.company_slogan, L, pageH - 15, { width: CW, align: 'center' });

  return doc;
}

// Arma el PDF de una FACTURA: los datos del cliente, el detalle de lo
// facturado y los totales, mas la informacion de certificacion fiscal FEL
// si ya fue certificada (o un aviso de que todavia esta pendiente — ver
// src/services/felCertifier.js, que hoy no genera un UUID/serie real).
export function generarFacturaPDF(invoice, settings) {
  const cfg = empresa(settings);
  const doc = new PDFDocument({ size: 'A4', margin: 0, autoFirstPage: true });
  const W = doc.page.width;
  const L = 40;
  const R = W - 40;
  const CW = R - L;

  // ── ENCABEZADO ───────────────────────────────────────────
  doc.rect(0, 0, W, 110).fill(AZUL);
  try {
    const logoPath = join(__dirname, '../assets/logo.jpeg');
    doc.image(logoPath, L, 15, { height: 75 });
  } catch(e) {}

  dibujarDatosEmpresa(doc, cfg);

  doc.fontSize(22).font('Helvetica-Bold').fillColor(NARANJA)
     .text('FACTURA', 350, 18, { width: 200, align: 'right' });
  doc.fontSize(12).font('Helvetica').fillColor(BLANCO)
     .text('No. ' + (invoice.number || '0001'), 350, 48, { width: 200, align: 'right' });

  const fechaDoc = invoice.date ? new Date(invoice.date).toLocaleDateString('es-GT') : '-';
  doc.fontSize(8).fillColor('#94a3b8')
     .text('Fecha: ' + fechaDoc, 350, 68, { width: 200, align: 'right' })
     .text('Orden No. ' + (invoice.work_order_number || '-'), 350, 80, { width: 200, align: 'right' });

  let y = 122;

  // ── DATOS DEL CLIENTE ────────────────────────────────────
  doc.rect(L, y, CW, 20).fill(AZUL_MED);
  doc.fillColor(BLANCO).fontSize(9).font('Helvetica-Bold')
     .text('DATOS DEL CLIENTE', L + 8, y + 6);
  y += 26;

  doc.fillColor(NEGRO).fontSize(9).font('Helvetica-Bold').text('Cliente:', L, y);
  doc.font('Helvetica').text(invoice.client_name || '-', L + 55, y);
  y += 14;
  if (invoice.client_email) {
    doc.font('Helvetica-Bold').text('Correo:', L, y);
    doc.font('Helvetica').text(invoice.client_email, L + 55, y);
    y += 14;
  }
  y += 10;

  // ── LINEAS (tabla de items facturados) ────────────────────
  const items = invoice.items || [];
  doc.rect(L, y, CW, 17).fill('#1e3a5f');
  doc.fillColor(BLANCO).fontSize(8).font('Helvetica-Bold')
     .text('DESCRIPCION', L + 8, y + 5)
     .text('CANT.', R - 175, y + 5, { width: 45, align: 'center' })
     .text('PRECIO UNIT.', R - 125, y + 5, { width: 65, align: 'right' })
     .text('SUBTOTAL', R - 55, y + 5, { width: 55, align: 'right' });
  y += 19;
  items.forEach((item, idx) => {
    if (y > 680) { doc.addPage({ margin: 0 }); y = 40; }
    doc.rect(L, y, CW, 15).fill(idx % 2 === 0 ? '#f1f5f9' : BLANCO);
    doc.fillColor(NEGRO).fontSize(8).font('Helvetica')
       .text(item.description || '-', L + 8, y + 4, { width: CW - 220 })
       .text(Number(item.quantity).toFixed(2), R - 175, y + 4, { width: 45, align: 'center' })
       .text('Q ' + Number(item.unit_price).toFixed(2), R - 125, y + 4, { width: 65, align: 'right' })
       .text('Q ' + Number(item.subtotal).toFixed(2), R - 55, y + 4, { width: 55, align: 'right' });
    y += 16;
  });

  // ── TOTALES ──────────────────────────────────────────────
  if (y > 680) { doc.addPage({ margin: 0 }); y = 40; }
  y += 6;
  doc.moveTo(L, y).lineTo(R, y).strokeColor('#e2e8f0').stroke();
  y += 10;

  const subtotal = Number(invoice.subtotal) || 0;
  const discount = Number(invoice.discount) || 0;
  const total = Number(invoice.total) || 0;

  doc.fillColor(NEGRO).fontSize(9).font('Helvetica')
     .text('Subtotal:', R - 180, y, { width: 125, align: 'right' })
     .text('Q ' + subtotal.toFixed(2), R - 50, y, { width: 50, align: 'right' });
  y += 16;

  if (discount > 0) {
    doc.text('Descuento:', R - 180, y, { width: 125, align: 'right' })
       .text('- Q ' + discount.toFixed(2), R - 50, y, { width: 50, align: 'right' });
    y += 16;
  }

  doc.rect(R - 200, y, 200, 26).fill(NARANJA);
  doc.fillColor(BLANCO).fontSize(11).font('Helvetica-Bold')
     .text('TOTAL:', R - 200, y + 8, { width: 140, align: 'right' })
     .text('Q ' + total.toFixed(2), R - 55, y + 8, { width: 55, align: 'right' });
  y += 36;

  // ── CERTIFICACION FEL ────────────────────────────────────
  if (y > 700) { doc.addPage({ margin: 0 }); y = 40; }
  if (invoice.fel_uuid) {
    doc.fillColor(NEGRO).fontSize(8).font('Helvetica-Bold').text('Certificacion FEL', L, y);
    y += 12;
    doc.font('Helvetica').fontSize(7)
       .text('UUID: ' + invoice.fel_uuid, L, y)
       .text('Serie: ' + (invoice.fel_series || '-') + '   No.: ' + (invoice.fel_number || '-'), L, y + 10);
    y += 24;
  } else {
    doc.rect(L, y, CW, 24).fill('#fef3c7');
    doc.fillColor('#92400e').fontSize(8).font('Helvetica-Bold')
       .text('Certificacion FEL pendiente de integrar — documento interno, no valido como factura fiscal.', L + 8, y + 8, { width: CW - 16 });
    y += 30;
  }

  // ── PIE DE PÁGINA ─────────────────────────────────────────
  const pageH2 = doc.page.height;
  doc.rect(0, pageH2 - 38, W, 38).fill(AZUL);
  doc.fillColor('#94a3b8').fontSize(7).font('Helvetica')
     .text('Factura interna - ' + cfg.company_name, L, pageH2 - 28, { width: CW / 2 })
     .text(pieEmpresa(cfg), R - 150, pageH2 - 28, { width: 150, align: 'right' });
  doc.fillColor(NARANJA).fontSize(8).font('Helvetica-Bold')
     .text(cfg.company_slogan, L, pageH2 - 15, { width: CW, align: 'center' });

  return doc;
}

// Nombres en español, para mostrar en el PDF, de las 4 etapas fijas con las
// que nacio este modulo (reportes con photo_schema_version=1 -- ver
// workReportService.js/037_work_report_photo_categories.sql).
const STAGE_LABELS = {
  antes: 'Antes de Desarmar',
  desarmado: 'Desarmado + Piezas Nuevas',
  piezas_nuevas: 'Piezas Instaladas + Piezas Usadas',
  armado_final: 'Armado Final',
};

// Las 8 categorias nuevas (photo_schema_version=2), mismas llaves y orden que
// PHOTO_CATEGORIES en workReportService.js (se duplica aqui a proposito, como
// ya pasaba con STAGE_LABELS: este archivo no depende de los services).
const PHOTO_CATEGORY_LABELS = {
  ingreso: 'Ingreso de Equipo',
  placa_datos: 'Placa de Datos',
  mediciones_ingreso: 'Mediciones Eléctricas de Ingreso',
  desarme: 'Proceso de Desarme',
  mantenimiento: 'Mantenimiento o Rebobinado',
  repuestos: 'Repuestos',
  armado: 'Equipo Armado',
  mediciones_finales: 'Mediciones Eléctricas Finales',
};

// Arma el PDF de un REPORTE DE TRABAJO: la informacion general de la orden, y
// por cada etapa/categoria de fotos (las 4 de siempre o las 8 nuevas, segun
// report.photo_schema_version) su nota y las fotos que se subieron; en los
// reportes nuevos tambien la duracion del video de prueba final (un PDF no
// puede reproducirlo, solo deja constancia de que existe); y las firmas del
// tecnico y del cliente al final. Las fotos y firmas se insertan leyendo el
// archivo real desde la carpeta de "uploads" del servidor; si algun archivo
// ya no existe en disco, se dibuja un recuadro gris en su lugar en vez de
// fallar.
export function generarReportePDF(report, settings, locales = null) {
  const cfg = empresa(settings);
  const doc = new PDFDocument({ size: 'A4', margin: 0, autoFirstPage: true });
  const W = doc.page.width;
  const L = 40;
  const R = W - 40;
  const CW = R - L;

  // ── ENCABEZADO ───────────────────────────────────────────
  doc.rect(0, 0, W, 110).fill(AZUL);
  try {
    const logoPath = join(__dirname, '../assets/logo.jpeg');
    doc.image(logoPath, L, 15, { height: 75 });
  } catch(e) {}

  dibujarDatosEmpresa(doc, cfg);

  doc.fontSize(18).font('Helvetica-Bold').fillColor(NARANJA)
     .text('REPORTE DE TRABAJO', 220, 20, { width: 330, align: 'right' });
  doc.fontSize(12).font('Helvetica').fillColor(BLANCO)
     .text('No. ' + (report.number || '0001'), 350, 48, { width: 200, align: 'right' });
  doc.fontSize(8).fillColor('#94a3b8')
     .text('Orden No. ' + (report.work_order_number || '-'), 350, 68, { width: 200, align: 'right' });

  let y = 122;

  // ── INFORMACION GENERAL ──────────────────────────────────
  doc.rect(L, y, CW, 20).fill(AZUL_MED);
  doc.fillColor(BLANCO).fontSize(9).font('Helvetica-Bold').text('INFORMACION GENERAL', L + 8, y + 6);
  y += 26;

  doc.fillColor(NEGRO).fontSize(9).font('Helvetica-Bold').text('Cliente:', L, y);
  doc.font('Helvetica').text(report.client_name || '-', L + 55, y);
  doc.font('Helvetica-Bold').text('Equipo:', L + 280, y);
  doc.font('Helvetica').text(report.equipment_name || '-', L + 330, y, { width: CW - 290 });
  y += 16;

  if (report.general_notes) {
    doc.font('Helvetica-Bold').text('Notas generales:', L, y);
    doc.font('Helvetica').text(report.general_notes, L + 100, y, { width: CW - 100 });
    y += doc.heightOfString(report.general_notes, { width: CW - 100 }) + 6;
  }
  y += 8;

  // ── ETAPAS/CATEGORIAS: nota + fotos ────────────────────────
  // Version 1 (reportes viejos) imprime las 4 etapas de siempre; version 2
  // (las 8 categorias nuevas del manual de Abdias) imprime esas -- mismo
  // criterio de compatibilidad que el resto del modulo (ver
  // workReportService.js).
  const stageLabels = report.photo_schema_version === 1 ? STAGE_LABELS : PHOTO_CATEGORY_LABELS;
  const stageNotes = report.stage_notes || {};
  const photosByStage = (stage) => (report.photos || []).filter((p) => p.stage === stage);
  const THUMB = 100, GAP = 8;
  const perRow = Math.max(1, Math.floor((CW + GAP) / (THUMB + GAP)));

  Object.keys(stageLabels).forEach((stageKey) => {
    if (y > 690) { doc.addPage({ margin: 0 }); y = 40; }

    doc.rect(L, y, CW, 20).fill(NARANJA);
    doc.fillColor(BLANCO).fontSize(9).font('Helvetica-Bold')
       .text(stageLabels[stageKey].toUpperCase(), L + 8, y + 6);
    y += 26;

    const note = stageNotes[stageKey];
    if (note) {
      doc.fillColor(NEGRO).fontSize(8).font('Helvetica').text(note, L, y, { width: CW });
      y += doc.heightOfString(note, { width: CW }) + 8;
    }

    const photos = photosByStage(stageKey);
    if (photos.length === 0) {
      doc.fillColor(GRIS).fontSize(8).font('Helvetica-Oblique').text('Sin fotos en esta etapa.', L, y);
      y += 18;
    } else {
      photos.forEach((p, idx) => {
        const col = idx % perRow;
        if (col === 0 && idx !== 0) y += THUMB + 22;
        if (y > 650) { doc.addPage({ margin: 0 }); y = 40; }
        const x = L + col * (THUMB + GAP);
        try {
          const filePath = archivoLocal(p.photo_url, locales);
          doc.rect(x, y, THUMB, THUMB).fill('#f1f5f9');
          if (filePath) {
            doc.image(filePath, x, y, { fit: [THUMB, THUMB], align: 'center', valign: 'center' });
          }
        } catch(e) {
          doc.rect(x, y, THUMB, THUMB).fill('#f1f5f9');
        }
        if (p.caption) {
          doc.fillColor(GRIS).fontSize(6).font('Helvetica')
             .text(p.caption, x, y + THUMB + 2, { width: THUMB });
        }
      });
      y += THUMB + 22;
    }
    y += 4;
  });

  // ── VIDEO DE PRUEBA FINAL (solo reportes version 2) ────────
  // Un PDF no puede reproducir video: se imprime su duracion/tamaño como
  // constancia de que existe, y el archivo real se ve/descarga desde el
  // sistema (GET /uploads/<archivo>).
  if (report.photo_schema_version !== 1) {
    if (y > 690) { doc.addPage({ margin: 0 }); y = 40; }
    doc.rect(L, y, CW, 20).fill(NARANJA);
    doc.fillColor(BLANCO).fontSize(9).font('Helvetica-Bold')
       .text('VIDEO DE PRUEBA FINAL', L + 8, y + 6);
    y += 26;
    if (report.final_video_url) {
      const size = report.final_video_size_bytes ? (report.final_video_size_bytes / (1024 * 1024)).toFixed(1) + ' MB' : '';
      doc.fillColor(NEGRO).fontSize(8).font('Helvetica')
         .text(`Duración: ${report.final_video_duration_seconds || '-'}s${size ? ' · ' + size : ''} (disponible en el sistema)`, L, y);
    } else {
      doc.fillColor(GRIS).fontSize(8).font('Helvetica-Oblique').text('Sin video.', L, y);
    }
    y += 22;
  }

  // ── FIRMAS ─────────────────────────────────────────────────
  if (y > 630) { doc.addPage({ margin: 0 }); y = 40; }
  y += 6;
  doc.moveTo(L, y).lineTo(R, y).strokeColor('#e2e8f0').stroke();
  y += 14;
  doc.fillColor(NEGRO).fontSize(9).font('Helvetica-Bold').text('FIRMAS', L, y);
  y += 20;

  const sigW = (CW - 30) / 2;
  const sigH = 70;
  const sigX2 = L + sigW + 30;

  const drawSignature = (x, url, name, label) => {
    doc.rect(x, y, sigW, sigH).lineWidth(0.7).strokeColor('#cbd5e1').stroke();
    const filePath = archivoLocal(url, locales);
    if (filePath) {
      try {
        doc.image(filePath, x + 5, y + 5, { fit: [sigW - 10, sigH - 10], align: 'center', valign: 'center' });
      } catch(e) {}
    }
    doc.fillColor(NEGRO).fontSize(8).font('Helvetica')
       .text(name || '_______________________', x, y + sigH + 4, { width: sigW, align: 'center' });
    doc.fillColor(GRIS).fontSize(7).font('Helvetica')
       .text(label, x, y + sigH + 16, { width: sigW, align: 'center' });
  };

  drawSignature(L, report.tech_signature_url, report.tech_signature_name, 'Tecnico que entrega');
  drawSignature(sigX2, report.client_signature_url, report.client_signature_name, 'Recibido por');
  y += sigH + 30;

  // ── PIE DE PÁGINA ─────────────────────────────────────────
  const pageH3 = doc.page.height;
  doc.rect(0, pageH3 - 38, W, 38).fill(AZUL);
  doc.fillColor('#94a3b8').fontSize(7).font('Helvetica')
     .text('Reporte de Trabajo - ' + cfg.company_name, L, pageH3 - 28, { width: CW / 2 })
     .text(pieEmpresa(cfg), R - 150, pageH3 - 28, { width: 150, align: 'right' });
  doc.fillColor(NARANJA).fontSize(8).font('Helvetica-Bold')
     .text(cfg.company_slogan, L, pageH3 - 15, { width: CW, align: 'center' });

  return doc;
}
