/**
 * Prueba end-to-end contra el sandbox de Digifact: arma un documento NUC de
 * ejemplo (una factura con una linea) y lo certifica de verdad. Uso puntual
 * para validar la integracion antes de certificar facturas reales desde la
 * app -- no crea ni modifica nada en la base de datos del taller.
 *
 * Uso: node scripts/test_digifact_certify.mjs
 */
import { certifyDte } from '../src/lib/digifactClient.js';
import { buildFacturaPayload } from '../src/lib/nucBuilder.js';

const fakeInvoice = {
  tipo_dte: 'FACT',
  moneda: 'GTQ',
  discount: 0,
  items: [
    { description: 'Prueba de integracion Digifact', item_type: 'servicio', quantity: 1, unit_price: 100 },
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
