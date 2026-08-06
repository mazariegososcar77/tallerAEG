/**
 * Construye el documento NUC (JSON) que exige Digifact para certificar una
 * factura (FACT). Forma y nombres de campo tomados de la documentacion real:
 * https://documentacion.digifact.com/gt/nuc/json (y su ejemplo `fact-cf-json`).
 *
 * Recibe una factura con la forma real de `invoiceRepository.findById`
 * (tabla `invoices`: `discount`, no `descuento`; `invoice_items` sin
 * `item_type`, por eso toda linea se manda como "Servicio").
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
  // TaxIDType solo se agrega para indicar que TaxID es un CUI (DPI), no un NIT
  // (doc oficial, campo C03: "Agregar este elemento cuando se desee informar el
  // CUI del receptor"). Para NIT normal, no se incluye el atributo.
  if (client?.nit) {
    return {
      TaxID: client.nit,
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
    TaxID: d.emisorNit || d.nit,
    TaxIDAdditionalInfo: [{ Name: 'AfiliacionIVA', Data: null, Value: d.afiliacionIva }],
    Name: d.emisorNombre,
    // Frase/Escenario: confirmados por Digifact para este NIT (soporte@digifact.com.gt).
    // Sin esto, Digifact rechaza cualquier FACT con "Validacion de FRASES Seccion 2.6,
    // El tipo de DTE (FACT) debe incluir la FRASE (1)".
    // OJO: el nombre de campo real es "Escenario", NO "CodigoEscenario" -- la tabla de la
    // doc oficial (pag. 16) confundia facil porque la columna "Descripcion" dice "Codigo de
    // escenario", pero la columna "Informacion" (el nombre real del campo) es "Escenario".
    // Confirmado contra los 5+ ejemplos reales que da Digifact (NUC 1 FACT CF/CUI, NUC 2
    // FCAM, NUC FPEQ, NUC 8 RDON, NUC 7 RECI en XML): todos usan literalmente "Escenario".
    // "Data" tampoco es el valor de la frase -- es un indice de correlacion que amarra
    // TipoFrase con su Escenario correspondiente. Como solo mandamos una frase, ambos
    // comparten Data="1"; el valor real va en "Value".
    AdditionlInfo: [
      { Name: 'TipoFrase', Data: '1', Value: d.frase },
      { Name: 'Escenario', Data: '1', Value: d.escenario },
    ],
    ...(d.emisorEmail ? { Contact: { EmailList: { Email: [d.emisorEmail] } } } : {}),
    BranchInfo: {
      Code: d.establecimientoCodigo,
      Name: d.establecimientoNombre,
      AddressInfo: {
        Address: d.emisorDireccion,
        // "City" es el CODIGO POSTAL de la ubicacion (doc oficial, campo B0722:
        // "Codigo postal... debe corresponder a un codigo valido"), no un codigo
        // geografico depto+municipio como se asumio inicialmente.
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
  const descuento = Number(invoice.discount) || 0;

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
    // Valor real segun los ejemplos que da Digifact (NUC 1 FACT CF/CUI, etc.): "Bien" o
    // "Servicio" (solo la inicial en mayuscula) -- la tabla D04 de la doc prosa sugeria
    // mayusculas totales ("BIEN"/"SERVICIO"), pero eso no coincide con ningun ejemplo real
    // y la API es case-sensitive, asi que se sigue el formato de los ejemplos.
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
    // El transformador de Digifact exige que el elemento exista (aunque vaya vacio) --
    // confirmado empiricamente contra el sandbox: "No se encuentra el elemento
    // AdditionalDocumentInfo" cuando se omite por completo.
    AdditionalDocumentInfo: { AdditionalInfo: [] },
  };
}
