import PDFDocument from 'pdfkit';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const AZUL = '#0C1733';
const AZUL_MED = '#16285C';
const NARANJA = '#E8551C';
const GRIS = '#64748b';
const NEGRO = '#1e293b';
const BLANCO = '#ffffff';

export function generarCotizacionPDF(quote) {
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

  doc.fillColor(BLANCO).fontSize(18).font('Helvetica-Bold')
     .text('TALLER AEG', 160, 20);
  doc.fontSize(9).font('Helvetica')
     .text('Taller de Embobinado Industrial', 160, 42)
     .text('Guatemala, Guatemala', 160, 55)
     .text('Tel: (+502) 0000-0000', 160, 68);

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
     .text('Esta cotizacion tiene validez de 15 dias a partir de la fecha de emision.', L, pageH - 28, { width: CW / 2 })
     .text('Taller AEG — Guatemala', R - 150, pageH - 28, { width: 150, align: 'right' });
  doc.fillColor(NARANJA).fontSize(8).font('Helvetica-Bold')
     .text('Gracias por su preferencia', L, pageH - 15, { width: CW, align: 'center' });

  return doc;
}

export function generarOrdenTrabajoPDF(order) {
  const doc = new PDFDocument({ size: 'A4', margin: 0, autoFirstPage: true });
  const W = doc.page.width;
  const L = 40;
  const R = W - 40;
  const CW = R - L;

  doc.rect(0, 0, W, 110).fill(AZUL);
  try {
    const logoPath = join(__dirname, '../assets/logo.png');
    doc.image(logoPath, L, 15, { height: 75 });
  } catch(e) {}

  doc.fillColor(BLANCO).fontSize(18).font('Helvetica-Bold').text('TALLER AEG', 160, 20);
  doc.fontSize(9).font('Helvetica')
     .text('Taller de Embobinado Industrial', 160, 42)
     .text('Guatemala, Guatemala', 160, 55)
     .text('Tel: (+502) 0000-0000', 160, 68);

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

  doc.rect(L, y, CW, 20).fill(AZUL_MED);
  doc.fillColor(BLANCO).fontSize(9).font('Helvetica-Bold').text('INFORMACION GENERAL', L + 8, y + 6);
  y += 26;

  const col2 = L + CW / 2;
  doc.fillColor(NEGRO).fontSize(9).font('Helvetica-Bold').text('Cliente:', L, y);
  doc.font('Helvetica').text(order.client_name || '-', L + 60, y);
  doc.font('Helvetica-Bold').text('Estado:', col2, y);
  doc.font('Helvetica').text(statusLabel, col2 + 50, y);
  y += 14;

  doc.fillColor(NEGRO).font('Helvetica-Bold').text('Autorizado por:', L, y);
  doc.font('Helvetica').text(order.authorized_by || '-', L + 90, y);
  if (order.project) {
    doc.font('Helvetica-Bold').text('Proyecto:', col2, y);
    doc.font('Helvetica').text(order.project, col2 + 60, y);
  }
  y += 14;

  if (order.quotation_number) {
    doc.fillColor(NEGRO).font('Helvetica-Bold').text('No. Cotizacion:', L, y);
    doc.font('Helvetica').text(order.quotation_number, L + 90, y);
    y += 14;
  }
  y += 6;

  doc.rect(L, y, CW, 20).fill(AZUL_MED);
  doc.fillColor(BLANCO).fontSize(9).font('Helvetica-Bold').text('DATOS DEL EQUIPO', L + 8, y + 6);
  y += 26;

  doc.fillColor(NEGRO).fontSize(9).font('Helvetica-Bold').text('Equipo:', L, y);
  doc.font('Helvetica').text(order.equipment_name || '-', L + 55, y);
  doc.font('Helvetica-Bold').text('Marca:', col2, y);
  doc.font('Helvetica').text(order.brand || '-', col2 + 45, y);
  y += 14;

  doc.font('Helvetica-Bold').text('Serie/Modelo:', L, y);
  doc.font('Helvetica').text(order.serial || '-', L + 80, y);
  y += 14;

  const specs = [];
  if (order.kw) specs.push('KW: ' + order.kw);
  if (order.voltage) specs.push('Voltaje: ' + order.voltage);
  if (order.amperage) specs.push('Amp: ' + order.amperage);
  if (order.rpm) specs.push('RPM: ' + order.rpm);
  if (order.hp) specs.push('HP: ' + order.hp);
  if (order.frame) specs.push('Frame: ' + order.frame);

  if (specs.length > 0) {
    doc.fillColor(NEGRO).font('Helvetica-Bold').text('Especificaciones:', L, y);
    doc.font('Helvetica').text(specs.join('   |   '), L + 100, y, { width: CW - 100 });
    y += 14;
  }
  y += 6;

  doc.rect(L, y, CW, 20).fill(NARANJA);
  doc.fillColor(BLANCO).fontSize(9).font('Helvetica-Bold').text('TRABAJO A REALIZAR', L + 8, y + 6);
  y += 26;

  if (order.work_type) {
    doc.fillColor(NEGRO).font('Helvetica-Bold').text('Tipo de trabajo:', L, y);
    doc.font('Helvetica').text(order.work_type, L + 95, y);
    y += 14;
  }
  if (order.dte_number) {
    doc.font('Helvetica-Bold').text('DTE No.:', L, y);
    doc.font('Helvetica').text(order.dte_number, L + 60, y);
    y += 14;
  }
  if (order.oc_number) {
    doc.font('Helvetica-Bold').text('O.C. No.:', L, y);
    doc.font('Helvetica').text(order.oc_number, L + 60, y);
    y += 14;
  }
  if (order.observations) {
    doc.font('Helvetica-Bold').text('Observaciones:', L, y);
    doc.font('Helvetica').text(order.observations, L + 95, y, { width: CW - 95 });
    y += doc.heightOfString(order.observations, { width: CW - 95 }) + 6;
  }

  doc.fillColor(NEGRO).font('Helvetica-Bold').text('Tecnico Desarma:', L, y);
  doc.font('Helvetica').text(order.tech_disarm || '-', L + 105, y);
  doc.font('Helvetica-Bold').text('Tecnico Arma:', col2, y);
  doc.font('Helvetica').text(order.tech_assemble || '-', col2 + 85, y);
  y += 20;

  const partes = (order.items || []).filter(i => i.has_item);
  if (partes.length > 0) {
    if (y > 650) { doc.addPage({ margin: 0 }); y = 40; }
    doc.rect(L, y, CW, 20).fill(AZUL_MED);
    doc.fillColor(BLANCO).fontSize(9).font('Helvetica-Bold').text('PARTES DEL EQUIPO RECIBIDAS', L + 8, y + 6);
    y += 26;
    const cols3 = Math.floor(CW / 3);
    partes.forEach((p, idx) => {
      const col = idx % 3;
      const px = L + col * cols3;
      doc.fillColor(NEGRO).fontSize(8).font('Helvetica').text('- ' + p.name, px, y, { width: cols3 - 10 });
      if (col === 2 || idx === partes.length - 1) y += 14;
    });
    y += 6;
  }

  if (order.total) {
    y += 6;
    doc.moveTo(L, y).lineTo(R, y).strokeColor('#e2e8f0').stroke();
    y += 10;
    doc.rect(R - 200, y, 200, 26).fill(NARANJA);
    doc.fillColor(BLANCO).fontSize(11).font('Helvetica-Bold')
       .text('TOTAL:', R - 200, y + 8, { width: 140, align: 'right' })
       .text('Q ' + Number(order.total).toFixed(2), R - 55, y + 8, { width: 55, align: 'right' });
    y += 36;
  }

  if (y > 680) { doc.addPage({ margin: 0 }); y = 40; }
  y += 20;
  doc.moveTo(L, y + 30).lineTo(L + 150, y + 30).strokeColor('#94a3b8').lineWidth(0.5).stroke();
  doc.moveTo(R - 150, y + 30).lineTo(R, y + 30).strokeColor('#94a3b8').lineWidth(0.5).stroke();
  doc.fillColor(GRIS).fontSize(8).font('Helvetica')
     .text('Firma Cliente', L, y + 34, { width: 150, align: 'center' })
     .text('Firma Tecnico', R - 150, y + 34, { width: 150, align: 'center' });

  const pageH = doc.page.height;
  doc.rect(0, pageH - 38, W, 38).fill(AZUL);
  doc.fillColor('#94a3b8').fontSize(7).font('Helvetica')
     .text('Orden de Trabajo - Taller AEG', L, pageH - 28, { width: CW / 2 })
     .text('Taller AEG - Guatemala', R - 150, pageH - 28, { width: 150, align: 'right' });
  doc.fillColor(NARANJA).fontSize(8).font('Helvetica-Bold')
     .text('Gracias por su preferencia', L, pageH - 15, { width: CW, align: 'center' });

  return doc;
}
