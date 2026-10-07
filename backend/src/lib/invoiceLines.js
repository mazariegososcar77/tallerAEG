// Arma las LINEAS y los TOTALES de la factura de una orden de trabajo a partir de su
// cotizacion. Es una funcion pura (sin base de datos) a proposito: lo que aqui se calcule es lo
// que despues se certifica ante la SAT, asi que tiene que poder probarse sola.
//
// Reglas:
//   * Una cotizacion con VARIOS equipos genera una orden por equipo, y cada factura lleva solo
//     las lineas de SU equipo (quote_items.equipment_index). Antes se copiaban las lineas de
//     todos los equipos en cada factura y a la SAT se certificaba el total de la cotizacion
//     completa una vez por orden.
//   * El descuento de la cotizacion es global: se reparte entre los equipos en proporcion a lo
//     que suma cada uno. Antes se perdia (la factura salia con descuento 0).
//   * Repuesto (item_type 'part') se declara como Bien y mano de obra ('labor') como Servicio
//     (SAT, regla 2.3.8 "Bien o Servicio").
//   * Si no hay cotizacion, o no se puede saber a que equipo corresponde la orden, la factura
//     es una sola linea con el total de la orden (que se prellena con el total de su equipo).

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
// Mismo criterio que calcTotals de cotizaciones: una cantidad vacia cuenta como 1.
const quantityOf = (item) => parseFloat(item.quantity) || 1;
const grossOf = (item) => quantityOf(item) * (parseFloat(item.unit_price) || 0);
const norm = (v) => String(v ?? '').trim().toLowerCase();

/**
 * Que lineas de la cotizacion le tocan a esta orden:
 *   { mode: 'all' }                 -> todas (la cotizacion es de un solo equipo, o es Post)
 *   { mode: 'equipment', index }    -> solo las de ese equipo
 *   { mode: 'unknown' }             -> orden vieja de una cotizacion con varios equipos que no
 *                                      se pudo reconocer
 */
export function quoteSelectionFor(order, quote) {
  const equipos = Array.isArray(quote?.equipment_data) ? quote.equipment_data : [];
  const indices = new Set((quote?.items || []).map((i) => Number(i.equipment_index) || 0));
  if (equipos.length <= 1 && indices.size <= 1) return { mode: 'all' };

  if (order.quote_equipment_index !== null && order.quote_equipment_index !== undefined && order.quote_equipment_index !== '') {
    return { mode: 'equipment', index: Number(order.quote_equipment_index) };
  }
  // La cotizacion Post se arma DESPUES, para una sola orden: todo lo cotizado es de esa orden.
  if (order.flow_type === 'post') return { mode: 'all' };

  // Ordenes creadas antes de que se guardara el equipo: se reconoce por sus datos. Solo vale
  // si coincide con UN equipo; con dos candidatos no se adivina.
  const candidatos = equipos
    .map((eq, index) => ({ eq, index }))
    .filter(({ eq }) =>
      (order.machine_id && eq?.machine_id && Number(order.machine_id) === Number(eq.machine_id)) ||
      (norm(order.serial) && norm(order.serial) === norm(eq?.serial)) ||
      (norm(order.equipment_name) && norm(order.equipment_name) === norm(eq?.name)
        && norm(order.brand) === norm(eq?.brand) && norm(order.model) === norm(eq?.model)));
  return candidatos.length === 1 ? { mode: 'equipment', index: candidatos[0].index } : { mode: 'unknown' };
}

function genericInvoice(order) {
  const total = round2(order.total);
  return {
    items: [{ description: `Servicio segun orden de trabajo No. ${order.number}`, quantity: 1, unit_price: total, item_type: 'servicio' }],
    subtotal: total,
    discount: 0,
    total,
  };
}

/**
 * @param {object} order  orden de trabajo (work_orders)
 * @param {object|null} quote  cotizacion con .items y .equipment_data (quoteRepository.findById)
 * @returns {{ items: object[], subtotal: number, discount: number, total: number }}
 */
export function buildInvoiceLines(order, quote) {
  const quoteItems = quote?.items || [];
  if (quoteItems.length === 0) return genericInvoice(order);

  const selection = quoteSelectionFor(order, quote);
  if (selection.mode === 'unknown') return genericInvoice(order);
  const lines = selection.mode === 'all'
    ? quoteItems
    : quoteItems.filter((i) => (Number(i.equipment_index) || 0) === selection.index);
  if (lines.length === 0) return genericInvoice(order);

  const quoteGross = quoteItems.reduce((s, i) => s + grossOf(i), 0);
  const linesGross = lines.reduce((s, i) => s + grossOf(i), 0);
  const quoteDiscount = Math.max(0, Number(quote.discount) || 0);
  const share = quoteGross > 0 ? linesGross / quoteGross : 0;
  const subtotal = round2(linesGross);
  const discount = Math.min(round2(quoteDiscount * share), subtotal);

  return {
    items: lines.map((i) => ({
      description: i.description,
      quantity: quantityOf(i),
      unit_price: Number(i.unit_price) || 0,
      item_type: i.item_type === 'part' ? 'bien' : 'servicio',
    })),
    subtotal,
    discount,
    total: round2(subtotal - discount),
  };
}
