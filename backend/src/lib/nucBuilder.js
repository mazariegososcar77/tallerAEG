/**
 * Construye el documento NUC (JSON) que exige Digifact para certificar una
 * factura (FACT). Forma y nombres de campo tomados de la documentacion real:
 * https://documentacion.digifact.com/gt/nuc/json (y su ejemplo `fact-cf-json`).
 *
 * Supuesto de negocio: `unit_price` en `invoice_items` ya incluye IVA (igual
 * que en cotizaciones/ordenes de trabajo, que nunca separan el impuesto). El
 * IVA que exige el NUC se EXTRAE de ese precio (12/112), no se suma aparte.
 * Esto asume regimen general (AfiliacionIVA=GEN); si Taller AEG factura bajo
 * otro regimen (pequeno contribuyente, etc.) este calculo hay que ajustarlo.
 */
import { env } from '../config/env.js';

const IVA_RATE = 0.12;

function n6(value) {
  return (Math.round((Number(value) || 0) * 1e6) / 1e6).toFixed(6);
}

/** "YYYY-MM-DDTHH:mm:ss-06:00" (Guatemala, UTC-6 fijo, sin horario de verano). */
function formatGtDateTime(date = new Date()) {
  const gt = new Date(date.getTime() - 6 * 60 * 60 * 1000);
  const pad = (v) => String(v).padStart(2, '0');
  return `${gt.getUTCFullYear()}-${pad(gt.getUTCMonth() + 1)}-${pad(gt.getUTCDate())}` +
    `T${pad(gt.getUTCHours())}:${pad(gt.getUTCMinutes())}:${pad(gt.getUTCSeconds())}-06:00`;
}

function buildBuyer(client) {
  if (client?.nit) {
    return {
      TaxID: client.nit,
      TaxIDType: 'NIT',
      Name: client.full_name || client.first_name,
      ...(client.address ? { AddressInfo: { Address: client.address, Country: 'GT' } } : {}),
    };
  }
  if (client?.dpi) {
    return {
      TaxID: client.dpi,
      TaxIDType: 'CUI',
      Name: client.full_name || client.first_name,
      ...(client.address ? { AddressInfo: { Address: client.address, Country: 'GT' } } : {}),
    };
  }
  return { TaxID: 'CF', Name: 'CONSUMIDOR FINAL' };
}

function buildSeller() {
  const d = env.digifact;
  return {
    TaxID: d.nit,
    TaxIDAdditionalInfo: [{ Name: 'AfiliacionIVA', Data: null, Value: d.afiliacionIva }],
    Name: d.emisorNombre,
    ...(d.emisorEmail ? { Contact: { EmailList: { Email: [d.emisorEmail] } } } : {}),
    BranchInfo: {
      Code: d.establecimientoCodigo,
      Name: d.establecimientoNombre,
      AddressInfo: {
        Address: d.emisorDireccion,
        City: d.emisorCodigoGeografico,
        District: d.emisorMunicipio,
        State: d.emisorDepartamento,
        Country: 'GT',
      },
    },
  };
}

/**
 * @param {object} invoice - factura con `.items` (de invoiceRepository.findById)
 * @param {object} client - cliente (de clientRepository.findById)
 */
export function buildFacturaPayload(invoice, client) {
  const items = invoice.items || [];
  const grossSubtotal = items.reduce((s, i) => s + Number(i.quantity) * Number(i.unit_price), 0);
  const descuento = Number(invoice.descuento) || 0;

  let totalIva = 0;
  let totalNet = 0;

  const nucItems = items.map((item, idx) => {
    const grossLine = Number(item.quantity) * Number(item.unit_price);
    const itemDiscount = grossSubtotal > 0 ? descuento * (grossLine / grossSubtotal) : 0;
    const netLine = grossLine - itemDiscount;
    const taxableAmount = netLine / (1 + IVA_RATE);
    const taxAmount = netLine - taxableAmount;
    totalIva += taxAmount;
    totalNet += netLine;

    const isBien = item.item_type === 'bien';
    return {
      Number: String(idx + 1),
      Type: isBien ? 'Bien' : 'Servicio',
      Description: item.description,
      Qty: n6(item.quantity),
      UnitOfMeasure: isBien ? 'UNI' : 'SER',
      Price: n6(item.unit_price),
      ...(itemDiscount > 0 ? { Discounts: { Discount: { Amount: n6(itemDiscount) } } } : { Discounts: null }),
      Taxes: { Tax: [{ Code: '1', Description: 'IVA', TaxableAmount: n6(taxableAmount), Amount: n6(taxAmount) }] },
      Totals: { TotalItem: n6(netLine) },
    };
  });

  return {
    Version: '1.00',
    CountryCode: 'GT',
    Header: {
      DocType: invoice.tipo_dte || 'FACT',
      IssuedDateTime: formatGtDateTime(),
      Currency: invoice.moneda || 'GTQ',
    },
    Seller: buildSeller(),
    Buyer: buildBuyer(client),
    Items: nucItems,
    Totals: {
      TotalTaxes: { TotalTax: [{ Description: 'IVA', Amount: n6(totalIva) }] },
      GrandTotal: { InvoiceTotal: n6(totalNet) },
    },
  };
}
