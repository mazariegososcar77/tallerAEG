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
  company_address: 'Guatemala, Guatemala',
  company_phone: '(+502) 5502-5055',
  company_email: '',
  company_nit: '',
  quote_valid_days: 15,
};

const empresa = (settings) => ({ ...EMPRESA_FALLBACK, ...(settings || {}) });

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
export function generarCotizacionPDF(quote, settings) {
  const cfg = empresa(settings);
  const doc = new PDFDocument({ size: 'A4', margin: 0, autoFirstPage: true });
  const W = doc.page.width;
  const L = 40;
  const R = W - 40;
  const CW = R - L;

  // ── HEADER ──────────────────────────────────────────────
  doc.rect(0, 0, W, 110).fill(AZUL);

  try {
    const logoPath = join(__dirname, '../assets/logo.png');
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

  const subtotal = Number(quote.subtotal) || 0;
  const discount = Number(quote.discount) || 0;
  const total = Number(quote.total) || 0;

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
     .text('Centro de servicio donde le damos vida a tus equipos', L, pageH - 15, { width: CW, align: 'center' });

  return doc;
}

// Arma el PDF de una ORDEN DE TRABAJO: la ficha del equipo que el cliente
// dejo en el taller (datos generales, especificaciones tecnicas, trabajo a
// realizar, partes recibidas) y espacios de firma para el cliente y el
// tecnico. A proposito NO muestra precios (eso es del modulo de
// Cotizaciones/Facturacion) — ver nota en backend/CLAUDE.md.
// Nombres en español, en el mismo orden del papel, para los checkboxes y filas fijas
// de la Orden de Trabajo (ver 029_work_orders_paper_form.sql -- se guardan como JSON).
// IMPORTANTE: aqui nunca se lee torno_price/parts_price/labor_price -- la Orden de
// Trabajo es un documento operativo/tecnico, el precio va solo en la Cotizacion.
const WORK_TYPE_LABELS = {
  mantenimiento: 'Mantenimiento',
  rebobinado: 'Rebobinado',
  cambio_conexion: 'Cambio de conexión',
  calculo_voltaje: 'Cálculo de voltaje',
  extraccion_humedad: 'Extracción de humedad',
  extraccion_lodo_8m3: 'Extracción de lodo (8 m3)',
  extraccion_lodo_12m3: 'Extracción de lodo (12 m3)',
};
const EQUIPMENT_CATEGORY_LABELS = { motor: 'Motor', bomba: 'Bomba', blower: 'Blower', generador: 'Generador', aireador: 'Aireador', turbina: 'Turbina' };
const EQUIPMENT_SUBTYPE_LABELS = {
  trifasico: 'Trifásico', monofasico: 'Monofásico', reductor: 'Reductor', ventilador: 'Ventilador', otros: 'Otros',
  sumergible: 'Sumergible', centrifuga: 'Centrífuga',
};
const PUMP_SEAL_TYPE_LABELS = { viton: 'Vitón', nitrilo: 'Nitrilo', conico: 'Cónico' };
const PHYSICAL_PART_LABELS = { variador: 'Variador', estator: 'Estator', rotor: 'Rotor', otros: 'Otros' };
const SCREW_ROWS = [
  'Motor', 'Tolva', 'Caja de conexión', 'Tapa de conexión', 'Bornera', 'Bomba',
  'Retén cojinete delantero', 'Retén cojinete trasero', 'Impulsor', 'Turbina',
  'Castigadores de polea', 'Roldanas tornillo impulsor', 'Tuercas', 'Washas',
];
const MEASUREMENT_LINE_FIELDS = [
  ['insulation', 'Medición de aislamiento'],
  ['ohms', 'Medición de OHMS'],
  ['amperage', 'Medición de amperaje'],
];

export function generarOrdenTrabajoPDF(order, settings) {
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

  // ── ENCABEZADO ───────────────────────────────────────────
  doc.rect(0, 0, W, 110).fill(AZUL);
  try {
    const logoPath = join(__dirname, '../assets/logo.png');
    doc.image(logoPath, L, 15, { height: 75 });
  } catch(e) {}

  dibujarDatosEmpresa(doc, cfg);

  doc.fontSize(22).font('Helvetica-Bold').fillColor(NARANJA)
     .text('ORDEN DE TRABAJO', 270, 18, { width: 280, align: 'right' });
  doc.fontSize(12).font('Helvetica').fillColor(BLANCO)
     .text('No. ' + (order.number || '0001'), 350, 48, { width: 200, align: 'right' });

  const fechaRecibido = order.received_at ? new Date(order.received_at).toLocaleDateString('es-GT') : '-';
  const fechaEntrega = order.delivery_at ? new Date(order.delivery_at).toLocaleDateString('es-GT') : '-';
  doc.fontSize(8).fillColor('#94a3b8')
     .text('Recibido: ' + fechaRecibido, 350, 68, { width: 200, align: 'right' })
     .text('Entrega: ' + fechaEntrega, 350, 80, { width: 200, align: 'right' });

  let y = 122;

  const statusLabels = { recibido: 'Recibido', en_proceso: 'En Proceso', listo: 'Listo', entregado: 'Entregado', cancelado: 'Cancelado' };
  const statusLabel = statusLabels[order.status] || order.status || '-';

  // ── INFORMACION GENERAL ──────────────────────────────────
  sectionHeader('INFORMACION GENERAL');
  field('Cliente:', order.client_name, L, 60);
  field('Estado:', statusLabel, col2, 50);
  y += 14;

  field('Autorizado por:', order.authorized_by, L, 90);
  if (order.project) field('Proyecto:', order.project, col2, 60);
  y += 14;

  const fechaProximoServicio = order.next_service_at ? new Date(order.next_service_at).toLocaleDateString('es-GT') : null;
  if (fechaProximoServicio) {
    field('Próximo servicio:', fechaProximoServicio, L, 110);
    y += 14;
  }
  if (order.reported_problem) {
    ensureSpace(24);
    doc.fillColor(NEGRO).font('Helvetica-Bold').fontSize(9).text('Falla o problema:', L, y);
    doc.font('Helvetica').text(order.reported_problem, L + 100, y, { width: CW - 100 });
    y += doc.heightOfString(order.reported_problem, { width: CW - 100 }) + 6;
  }
  y += 6;

  // ── TRABAJO A REALIZAR ────────────────────────────────────
  sectionHeader('TRABAJO A REALIZAR', NARANJA);
  const workTypes = Array.isArray(order.work_types) ? order.work_types : [];
  if (workTypes.length > 0) {
    threeColList(workTypes.map(t => WORK_TYPE_LABELS[t] || t));
    y += 4;
  }
  if (order.work_type) {
    ensureSpace(14);
    field('Tipo de trabajo:', order.work_type, L, 95);
    y += 14;
  }
  y += 6;

  // ── TIPO DE EQUIPO ─────────────────────────────────────────
  sectionHeader('TIPO DE EQUIPO');
  const et = order.equipment_type || {};
  field('Categoría:', EQUIPMENT_CATEGORY_LABELS[et.category] || et.category, L, 65);
  y += 14;
  if (Array.isArray(et.subtypes) && et.subtypes.length > 0) {
    threeColList(et.subtypes.map(s => EQUIPMENT_SUBTYPE_LABELS[s] || s));
  }
  if (et.aireador_size) {
    ensureSpace(14);
    field('Aireador (tamaño):', et.aireador_size, L, 110);
    y += 14;
  }
  if (et.turbina_kw) {
    ensureSpace(14);
    field('Turbina (Kw):', et.turbina_kw, L, 90);
    y += 14;
  }
  y += 6;

  // ── DATOS DEL EQUIPO ──────────────────────────────────────
  sectionHeader('DATOS DEL EQUIPO');
  field('Equipo:', order.equipment_name, L, 55);
  field('Marca:', order.brand, col2, 45);
  y += 14;

  field('Serie/Modelo:', order.serial, L, 80);
  y += 14;

  const specs = [];
  if (order.kw) specs.push('KW: ' + order.kw);
  if (order.voltage) specs.push('Voltaje: ' + order.voltage);
  if (order.amperage) specs.push('Amp: ' + order.amperage);
  if (order.rpm) specs.push('RPM: ' + order.rpm);
  if (order.hp) specs.push('HP: ' + order.hp);
  if (order.frame) specs.push('Frame: ' + order.frame);

  if (specs.length > 0) {
    doc.fillColor(NEGRO).fontSize(9).font('Helvetica-Bold').text('Especificaciones:', L, y);
    doc.font('Helvetica').text(specs.join('   |   '), L + 100, y, { width: CW - 100 });
    y += 14;
  }
  if (order.pump_impeller || order.pump_bm || order.pump_seal_size || order.pump_seal_type) {
    ensureSpace(28);
    field('Bomba - Impeller:', order.pump_impeller, L, 100);
    field('B.M.:', order.pump_bm, col2, 35);
    y += 14;
    field('Medida de sello:', order.pump_seal_size, L, 100);
    field('Tipo de sello:', PUMP_SEAL_TYPE_LABELS[order.pump_seal_type] || order.pump_seal_type, col2, 80);
    y += 14;
  }
  y += 6;

  // ── FISICA / MOTOR ─────────────────────────────────────────
  sectionHeader('FÍSICA / MOTOR', NARANJA);
  const physicalParts = Array.isArray(order.physical_parts) ? order.physical_parts : [];
  if (physicalParts.length > 0) {
    threeColList(physicalParts.map(p => PHYSICAL_PART_LABELS[p] || p));
    y += 4;
  }
  ensureSpace(28);
  field('Retenedores No.:', order.retainers_count, L, 100);
  field('Rectificar eje (mm):', order.shaft_rectify_mm, col2, 120);
  y += 14;
  field('Cambio cojinetes No.:', order.bearings_count, L, 130);
  field('Cojinetes (mm):', order.bearings_mm, col2, 95);
  y += 14;
  ensureSpace(28);
  field('Camisa sello (mm):', order.seal_liner_mm, L, 115);
  field('Tapa delantera (mm):', order.front_cover_mm, col2, 125);
  y += 14;
  field('Tapa trasera (mm):', order.rear_cover_mm, L, 110);
  field('Perf. ventilador (mm):', order.fan_hole_mm, col2, 130);
  y += 14;
  if (order.lathe_kw || order.lathe_hp) {
    ensureSpace(14);
    field('Torno - KW:', order.lathe_kw, L, 65);
    field('Torno - HP:', order.lathe_hp, col2, 65);
    y += 14;
  }
  y += 6;

  // ── TORNILLOS ────────────────────────────────────────────
  sectionHeader('TORNILLOS');
  const screws = Array.isArray(order.screws) ? order.screws : [];
  doc.fontSize(8);
  const scCols = Math.floor(CW / 2);
  SCREW_ROWS.forEach((part, idx) => {
    const row = screws.find(s => s.part === part) || {};
    const col = idx % 2;
    const px = L + col * scCols;
    if (col === 0) ensureSpace(13);
    doc.fillColor(NEGRO).font('Helvetica-Bold').text(part + ':', px, y, { width: scCols - 60 });
    doc.font('Helvetica').text(row.quantity || '-', px + scCols - 55, y, { width: 50 });
    if (col === 1 || idx === SCREW_ROWS.length - 1) y += 13;
  });
  doc.fontSize(9);
  y += 6;

  // ── PARTES DEL EQUIPO RECIBIDAS ───────────────────────────
  const partes = (order.items || []).filter(i => i.has_item);
  if (partes.length > 0) {
    sectionHeader('PARTES DEL EQUIPO RECIBIDAS');
    threeColList(partes.map(p => p.name));
    y += 6;
  }

  // ── MEDICION ─────────────────────────────────────────────
  const drawMeasurementBlock = (title, raw, variant) => {
    const m = raw || {};
    sectionHeader(title, NARANJA);
    doc.fontSize(9);
    for (const [key, label] of MEASUREMENT_LINE_FIELDS) {
      const row = m[key] || {};
      ensureSpace(13);
      doc.fillColor(NEGRO).font('Helvetica-Bold').text(label + ':', L, y, { width: 150 });
      doc.font('Helvetica').text('L1: ' + (row.l1 || '-') + '   L2: ' + (row.l2 || '-') + '   L3: ' + (row.l3 || '-'), L + 150, y, { width: CW - 150 });
      y += 13;
    }
    ensureSpace(13);
    field('Voltaje aplicado:', m.applied_voltage ? m.applied_voltage + ' V' : null, L, 105);
    field('Medición de tierra:', yesNo(m.ground), col2, 110);
    y += 13;
    ensureSpace(13);
    field('Conexión:', m.connection, L, 65);
    field('Temperatura:', m.temperature, col2, 80);
    y += 13;
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
  drawMeasurementBlock('MEDICIÓN — COMO INGRESA EQUIPO', order.measurement_intake, 'intake');
  drawMeasurementBlock('MEDICIÓN — COMO SE ENTREGA EQUIPO', order.measurement_delivery, 'delivery');

  // ── OBSERVACIONES ──────────────────────────────────────────
  if (order.observations) {
    sectionHeader('OBSERVACIONES', NARANJA);
    ensureSpace(20);
    doc.fillColor(NEGRO).font('Helvetica').fontSize(9).text(order.observations, L, y, { width: CW });
    y += doc.heightOfString(order.observations, { width: CW }) + 10;
  }

  // ── CIERRE ───────────────────────────────────────────────
  sectionHeader('CIERRE');
  field('Técnico desarma:', order.tech_disarm, L, 105);
  field('Técnico arma:', order.tech_assemble, col2, 85);
  y += 14;
  field('Superv. AEG recibe:', order.supervisor_aeg_receive, L, 115);
  field('Superv. AEG entrega:', order.supervisor_aeg_deliver, col2, 120);
  y += 14;
  field('Superv. cliente entrega:', order.supervisor_client_deliver, L, 135);
  field('Superv. cliente recibe:', order.supervisor_client_receive, col2, 135);
  y += 14;
  field('Envío:', order.shipping, L, 40);
  field('WhatsApp:', order.whatsapp_number, col2, 65);
  y += 14;
  field('Cotización #:', order.quotation_number, L, 80);
  field('DTE #:', order.dte_number, col2, 45);
  y += 14;
  field('O.C. #:', order.oc_number, L, 55);
  y += 14;
  y += 6;

  // ── FIRMAS ─────────────────────────────────────────────────
  ensureSpace(60);
  y += 20;
  doc.moveTo(L, y + 30).lineTo(L + 150, y + 30).strokeColor('#94a3b8').lineWidth(0.5).stroke();
  doc.moveTo(R - 150, y + 30).lineTo(R, y + 30).strokeColor('#94a3b8').lineWidth(0.5).stroke();
  doc.fillColor(GRIS).fontSize(8).font('Helvetica')
     .text('Firma Cliente', L, y + 34, { width: 150, align: 'center' })
     .text('Firma Tecnico', R - 150, y + 34, { width: 150, align: 'center' });

  // ── PIE DE PÁGINA ─────────────────────────────────────────
  const pageH = doc.page.height;
  doc.rect(0, pageH - 38, W, 38).fill(AZUL);
  doc.fillColor('#94a3b8').fontSize(7).font('Helvetica')
     .text('Orden de Trabajo - ' + cfg.company_name, L, pageH - 28, { width: CW / 2 })
     .text(pieEmpresa(cfg), R - 150, pageH - 28, { width: 150, align: 'right' });
  doc.fillColor(NARANJA).fontSize(8).font('Helvetica-Bold')
     .text('Centro de servicio donde le damos vida a tus equipos', L, pageH - 15, { width: CW, align: 'center' });

  return doc;
}

// Nombres en español, en el mismo orden del papel, para las filas fijas de
// las tablas de mediciones eléctricas y de componentes instalados (ver
// 028_service_order_field_report.sql -- se guardan como JSON en la base).
const MEASUREMENT_ROWS = [
  { key: 'sin_trabajar',  label: 'Voltaje / Sin trabajar' },
  { key: 'trabajando',    label: 'Trabajando' },
  { key: 'resistencia',   label: 'Resistencia línea a línea' },
  { key: 'monofasico',    label: 'Monofásico' },
  { key: 'aislamiento',   label: 'Medición de aislamiento' },
  { key: 'amperios',      label: 'Amperios en placa' },
];
const COMPONENT_ROWS = [
  'Motor', 'Bomba', 'Tanque', 'Ablandador', 'Contactor', 'Flip-On', 'Presostato',
  'Guardanivel', 'Protector Fase', 'Timer', 'Válv. Pie', 'Válv. Cheque', 'Válv. Esfera',
];
const ADDITIONAL_SPEC_FIELDS = [
  ['hp_motor', 'HP (Motor)'], ['voltaje', 'Voltaje'], ['hp_bomba', 'HP (Bomba)'], ['etapas', 'Etapas'],
  ['precarga_tanque', 'Precarga del Tanque'], ['tipo_filtro', 'Tipo de Filtro / Lbs.'],
  ['bimetalico', 'Bimetálico Graduado a'], ['tamano', 'Tamaño'], ['rango_presion', 'Rango de Presión (PSI)'],
  ['distancia_electrodos', 'Distancia entre Electrodos'], ['alto_volt', 'Alto Volt.'], ['bajo_volt', 'Bajo Volt.'],
  ['desb', 'Desb.'], ['retardo', 'Retardo'], ['programacion', 'Programación'], ['manometro', 'Manómetro'],
  ['cheque_bypass', 'Cheque By-Pass'], ['recirculacion', 'Recirculación'], ['valv_flote', 'Válv. Flote'],
];

// Arma el PDF de una ORDEN DE SERVICIO: el formato real que usa el taller para
// documentar una VISITA TÉCNICA DE CAMPO (bombas/pozos en el sitio del
// cliente) -- datos del cliente, fuente de energía, mediciones eléctricas,
// condiciones del equipo, componentes instalados, especificaciones
// adicionales, reporte técnico y firmas del técnico y del cliente.
export function generarOrdenServicioPDF(order, settings) {
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

  // ── ENCABEZADO ───────────────────────────────────────────
  doc.rect(0, 0, W, 110).fill(AZUL);
  try {
    const logoPath = join(__dirname, '../assets/logo.png');
    doc.image(logoPath, L, 15, { height: 75 });
  } catch(e) {}

  dibujarDatosEmpresa(doc, cfg);

  doc.fontSize(18).font('Helvetica-Bold').fillColor(NARANJA)
     .text('ORDEN DE SERVICIO', 220, 18, { width: 330, align: 'right' });
  doc.fontSize(12).font('Helvetica').fillColor(BLANCO)
     .text('No. ' + (order.number || '0001'), 350, 48, { width: 200, align: 'right' });
  doc.fontSize(8).fillColor('#94a3b8')
     .text('Visita: ' + (order.visit_date ? new Date(order.visit_date).toLocaleDateString('es-GT') : '-'), 350, 68, { width: 200, align: 'right' });

  let y = 122;

  const statusLabels = { programada: 'Programada', en_proceso: 'En Proceso', completada: 'Completada', cancelada: 'Cancelada' };

  // ── DATOS DEL CLIENTE ─────────────────────────────────────
  sectionHeader('DATOS DEL CLIENTE');
  field('Cliente:', order.client_name, L, 55);
  field('Estado:', statusLabels[order.status] || order.status, col2, 50);
  y += 14;
  field('Dirección:', order.client_address, L, 60);
  y += 14;
  field('Persona que llamó:', order.caller_name, L, 105);
  field('NIT:', order.client_nit, col2, 30);
  y += 14;
  field('Hora:', order.visit_time, L, 40);
  field('Teléfono:', order.client_phone, col2, 55);
  y += 14;
  field('Tipo Equipo:', order.equipment_name, L, 75);
  y += 16;
  if (order.reported_problem) {
    doc.fillColor(NEGRO).font('Helvetica-Bold').text('Problema Reportado:', L, y);
    doc.font('Helvetica').text(order.reported_problem, L + 120, y, { width: CW - 120 });
    y += doc.heightOfString(order.reported_problem, { width: CW - 120 }) + 8;
  }
  y += 4;

  // ── FUENTE DE ENERGÍA ─────────────────────────────────────
  sectionHeader('FUENTE DE ENERGÍA');
  field('Banco de Transformadores:', order.transformer_bank, L, 150);
  y += 14;
  field('Generador:', order.generator, L, 60);
  field('Voltaje:', order.voltage_source, col2, 50);
  y += 18;

  // ── MEDICIONES ELÉCTRICAS ─────────────────────────────────
  const measurements = order.electrical_measurements || [];
  if (measurements.length > 0) {
    sectionHeader('MEDICIONES ELÉCTRICAS DE LA FUENTE Y EL MOTOR', NARANJA);
    doc.fontSize(7.5);
    for (const row of MEASUREMENT_ROWS) {
      const m = measurements.find(r => r.key === row.key) || {};
      ensureSpace(12);
      doc.fillColor(NEGRO).font('Helvetica-Bold').text(row.label, L, y, { width: 140 });
      const cells = [m.c1, m.c2, m.c3, m.c4, m.c5, m.c6].map(v => v || '-').join('   |   ');
      doc.font('Helvetica').text(cells, L + 145, y, { width: CW - 265 });
      if (m.nota) doc.fillColor(GRIS).text(m.nota, R - 110, y, { width: 110, align: 'right' });
      y += 12;
    }
    doc.fontSize(9);
    y += 8;
  }

  // ── CONDICIONES DE TRABAJO DEL EQUIPO ─────────────────────
  sectionHeader('CONDICIONES DE TRABAJO DEL EQUIPO');
  field('Bombea de/a:', [order.pump_from, order.pump_to].filter(Boolean).join(' a '), L, 75);
  field('Tipo Pozo:', order.well_type === 'sumergible' ? 'Sumergible' : order.well_type === 'centrifuga' ? 'Centrífuga' : null, col2, 65);
  y += 14;
  field('Diámetro:', order.diameter, L, 60);
  field('Profundidad total:', order.total_depth, col2, 100);
  y += 14;
  field('Nivel estático:', order.static_level, L, 85);
  field('Nivel dinámico:', order.dynamic_level, col2, 90);
  y += 14;
  field('GPM:', order.gpm, L, 35);
  field('Cantidad de tubos:', order.pipe_count, col2, 105);
  y += 14;
  field('Línea aire:', order.air_line, L, 60);
  field('Calibre de cable:', order.cable_gauge, col2, 100);
  y += 14;
  field('Funda:', order.sleeve, L, 40);
  if (order.pool_dimensions) field('Dimensiones piscina:', order.pool_dimensions, col2, 115);
  y += 18;

  // ── DATOS DEL EQUIPO Y COMPONENTES INSTALADOS ─────────────
  const components = order.installed_components || [];
  if (components.length > 0) {
    sectionHeader('DATOS DEL EQUIPO Y COMPONENTES INSTALADOS', NARANJA);
    doc.fontSize(7.5).fillColor(BLANCO);
    ensureSpace(12);
    const cCols = [90, CW - 90 - 70 - 70 - 90 - 70, 70, 70, 90, 70];
    let cx = L;
    doc.rect(L, y, CW, 12).fill(AZUL_MED);
    ['Componente','Marca','Modelo','Serie','Especificación','Valor'].forEach((h, i) => { doc.fillColor(BLANCO).text(h, cx + 3, y + 2, { width: cCols[i] - 6 }); cx += cCols[i]; });
    y += 12;
    for (const name of COMPONENT_ROWS) {
      const c = components.find(r => r.component === name) || {};
      ensureSpace(11);
      cx = L;
      const cells = [name, c.marca, c.modelo, c.serie, c.especificacion, c.valor];
      cells.forEach((v, i) => { doc.fillColor(NEGRO).font(i === 0 ? 'Helvetica-Bold' : 'Helvetica').text(v || (i===0?'':'-'), cx + 3, y, { width: cCols[i] - 6 }); cx += cCols[i]; });
      y += 11;
    }
    doc.fontSize(9);
    y += 8;
  }

  // ── ESPECIFICACIONES ADICIONALES ──────────────────────────
  const specs = order.additional_specs || {};
  if (Object.values(specs).some(v => v)) {
    sectionHeader('ESPECIFICACIONES ADICIONALES');
    doc.fontSize(8);
    let sx = L, col = 0;
    const specColW = CW / 3;
    for (const [key, label] of ADDITIONAL_SPEC_FIELDS) {
      if (!specs[key]) continue;
      ensureSpace(12);
      doc.fillColor(NEGRO).font('Helvetica-Bold').text(label + ':', sx, y, { width: specColW - 10, continued: false });
      doc.font('Helvetica').text(String(specs[key]), sx, y + 10, { width: specColW - 10 });
      col++;
      if (col % 3 === 0) { sx = L; y += 24; } else { sx += specColW; }
    }
    if (col % 3 !== 0) y += 24;
    doc.fontSize(9);
    y += 6;
  }

  // ── REPORTE TÉCNICO ────────────────────────────────────────
  sectionHeader('REPORTE TÉCNICO', NARANJA);
  const reportText = order.technical_report || '-';
  doc.fillColor(NEGRO).font('Helvetica').text(reportText, L, y, { width: CW });
  y += doc.heightOfString(reportText, { width: CW }) + 12;

  field('Hora de Llegada:', order.arrival_time, L, 100);
  field('Hora de Salida:', order.departure_time, col2, 90);
  y += 20;

  // ── FIRMAS ─────────────────────────────────────────────────
  ensureSpace(100);
  doc.moveTo(L, y).lineTo(R, y).strokeColor('#e2e8f0').stroke();
  y += 14;
  doc.fillColor(NEGRO).fontSize(9).font('Helvetica-Bold').text('FIRMAS', L, y);
  y += 20;

  const sigW = (CW - 30) / 2;
  const sigH = 70;
  const sigX2 = L + sigW + 30;
  const drawSignature = (x, url, name, label) => {
    doc.rect(x, y, sigW, sigH).lineWidth(0.7).strokeColor('#cbd5e1').stroke();
    if (url) {
      try {
        const filePath = join(UPLOADS_DIR, url.replace('/uploads/', ''));
        doc.image(filePath, x + 5, y + 5, { fit: [sigW - 10, sigH - 10], align: 'center', valign: 'center' });
      } catch(e) {}
    }
    doc.fillColor(NEGRO).fontSize(8).font('Helvetica')
       .text(name || '_______________________', x, y + sigH + 4, { width: sigW, align: 'center' });
    doc.fillColor(GRIS).fontSize(7).font('Helvetica')
       .text(label, x, y + sigH + 16, { width: sigW, align: 'center' });
  };
  drawSignature(L, order.tech_signature_url, order.tech_signature_name, 'Firma Técnico');
  drawSignature(sigX2, order.client_signature_url, order.client_signature_name, 'F) Cliente');
  y += sigH + 30;

  // ── PIE DE PÁGINA ─────────────────────────────────────────
  const pageH = doc.page.height;
  doc.rect(0, pageH - 38, W, 38).fill(AZUL);
  doc.fillColor('#94a3b8').fontSize(7).font('Helvetica')
     .text('Orden de Servicio - ' + cfg.company_name, L, pageH - 28, { width: CW / 2 })
     .text(pieEmpresa(cfg), R - 150, pageH - 28, { width: 150, align: 'right' });
  doc.fillColor(NARANJA).fontSize(8).font('Helvetica-Bold')
     .text('Favor de verificar datos para facturación', L, pageH - 15, { width: CW, align: 'center' });

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
    const logoPath = join(__dirname, '../assets/logo.png');
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
     .text('Centro de servicio donde le damos vida a tus equipos', L, pageH2 - 15, { width: CW, align: 'center' });

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
export function generarReportePDF(report, settings) {
  const cfg = empresa(settings);
  const doc = new PDFDocument({ size: 'A4', margin: 0, autoFirstPage: true });
  const W = doc.page.width;
  const L = 40;
  const R = W - 40;
  const CW = R - L;

  // ── ENCABEZADO ───────────────────────────────────────────
  doc.rect(0, 0, W, 110).fill(AZUL);
  try {
    const logoPath = join(__dirname, '../assets/logo.png');
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
          const filePath = join(UPLOADS_DIR, p.photo_url.replace('/uploads/', ''));
          doc.rect(x, y, THUMB, THUMB).fill('#f1f5f9');
          doc.image(filePath, x, y, { fit: [THUMB, THUMB], align: 'center', valign: 'center' });
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
    if (url) {
      try {
        const filePath = join(UPLOADS_DIR, url.replace('/uploads/', ''));
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
     .text('Centro de servicio donde le damos vida a tus equipos', L, pageH3 - 15, { width: CW, align: 'center' });

  return doc;
}
