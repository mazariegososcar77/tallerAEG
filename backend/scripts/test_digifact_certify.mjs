/**
 * Prueba end-to-end contra el SANDBOX de Digifact: arma un documento NUC de
 * ejemplo y lo certifica de verdad. Uso puntual para validar la integracion
 * antes de certificar facturas reales desde la app -- no crea ni modifica
 * nada en la base de datos del taller.
 *
 * Se niega a correr con DIGIFACT_ENV=prod: ahi emitiria una factura fiscal
 * REAL ante la SAT por una venta que no existe (y gastaria un DTE). Para
 * comprobar la conexion en produccion esta test_digifact_token.mjs.
 *
 * Uso: node scripts/test_digifact_certify.mjs
 */
import { env } from '../src/config/env.js';
import { certifyDte } from '../src/lib/digifactClient.js';
import { buildFacturaPayload } from '../src/lib/nucBuilder.js';

if (env.digifact.environment === 'prod') {
  console.error('DIGIFACT_ENV=prod: esta prueba emitiria una factura REAL ante la SAT. No se ejecuta.');
  console.error('Para comprobar la conexion en produccion usa: node scripts/test_digifact_token.mjs');
  process.exit(1);
}

// Cubre los casos que la SAT valida aritmeticamente (reglas 2.3.5, 2.3.6 y 2.7): cantidad mayor
// a 1 (Precio = Cantidad x PrecioUnitario), una linea de bien y otra de servicio, y un descuento
// que se reparte entre las lineas. Total: 2 x 150 + 1 x 85.50 - 20 = Q365.50 (menos de Q2,500,
// el limite para Consumidor Final).
const fakeInvoice = {
  tipo_dte: 'FACT',
  moneda: 'GTQ',
  // Va como referencia interna (adenda): con ella se encuentra la prueba en el portal de Digifact.
  number: `PRUEBA-${Date.now()}`,
  discount: 20,
  items: [
    { description: 'Prueba de integracion Digifact - mano de obra', item_type: 'servicio', quantity: 2, unit_price: 150 },
    { description: 'Prueba de integracion Digifact - repuesto', item_type: 'bien', quantity: 1, unit_price: 85.5 },
  ],
};

// Sin nit/dpi -> buildBuyer() cae en el consumidor final generico (TaxID "CF", sin TaxIDType).
const fakeClient = {
  full_name: 'CONSUMIDOR FINAL',
};

const payload = buildFacturaPayload(fakeInvoice, fakeClient);
console.log('Payload NUC enviado:');
console.log(JSON.stringify(payload, null, 2));

try {
  const response = await certifyDte(payload);
  console.log('\nRespuesta de Digifact:');
  console.log(JSON.stringify(response, null, 2));
  process.exitCode = String(response.code) === '1' ? 0 : 1;
} catch (err) {
  console.error('\nFallo la certificacion:', err.message);
  if (err.details) console.error('Detalle:', JSON.stringify(err.details, null, 2));
  process.exitCode = 1;
}
