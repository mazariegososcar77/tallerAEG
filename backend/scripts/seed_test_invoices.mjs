/**
 * Genera datos FICTICIOS solo para poder probar el boton "Certificar" de
 * Facturacion contra Digifact: 1 cliente de prueba (si no existe ya), 25
 * ordenes de trabajo ficticias y sus 25 facturas en estado
 * "pendiente_certificacion". No usa el flujo real de reporte de trabajo
 * (fotos/notas/firmas) porque el unico objetivo es tener facturas listas
 * para certificar, no simular el flujo operativo completo.
 *
 * Idempotente: si el cliente de prueba ya existe (por email), lo reutiliza
 * en vez de crear uno nuevo: correr el script otra vez agrega 25 facturas
 * MAS, no duplica el cliente.
 *
 * Uso: node scripts/seed_test_invoices.mjs
 */
import pool from '../src/lib/db.js';
import * as clientRepository from '../src/repositories/clientRepository.js';
import * as workOrderRepository from '../src/repositories/workOrderRepository.js';
import * as invoiceRepository from '../src/repositories/invoiceRepository.js';

const TEST_EMAIL = 'pruebas.digifact@talleraeg.local';
const COUNT = 25;

async function getOrCreateTestClient() {
  const [rows] = await pool.query('SELECT * FROM clients WHERE email = ?', [TEST_EMAIL]);
  if (rows[0]) return rows[0];
  return clientRepository.create({
    nit: 'CFPRUEBA1',
    dpi: null,
    first_name: 'CLIENTE DE PRUEBA',
    last_name: '(Digifact - no usar)',
    email: TEST_EMAIL,
    address: 'Direccion de prueba, no real',
    phone: '00000000',
    is_active: 1,
  });
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

async function main() {
  const client = await getOrCreateTestClient();
  console.log(`Cliente de prueba: #${client.id} ${client.first_name} ${client.last_name}`);

  const created = [];
  for (let i = 1; i <= COUNT; i++) {
    const total = 150 + i * 25; // montos variados, solo para que no todas sean iguales

    const orderNumber = await workOrderRepository.getNextNumber();
    const order = await workOrderRepository.create({
      number: orderNumber,
      client_id: client.id,
      received_at: todayIso(),
      status: 'entregado',
      equipment_name: `Motor de prueba ${i}`,
      brand: 'PRUEBA',
      model: 'TEST',
      serial: `TEST-${String(i).padStart(3, '0')}`,
      work_type: 'Prueba de certificacion Digifact',
      observations: 'Orden ficticia generada por seed_test_invoices.mjs para probar el flujo de certificacion Digifact. No corresponde a trabajo real.',
      total,
    });

    const invoiceNumber = await invoiceRepository.getNextNumber();
    const invoice = await invoiceRepository.create({
      number: invoiceNumber,
      work_order_id: order.id,
      work_report_id: null,
      quote_id: null,
      client_id: client.id,
      date: todayIso(),
      subtotal: total,
      discount: 0,
      total,
      status: 'pendiente_certificacion',
    }, [
      { description: `Servicio de prueba Digifact - Orden No. ${order.number}`, quantity: 1, unit_price: total },
    ]);

    created.push({ order: order.number, invoice: invoice.number, total });
    console.log(`  [${i}/${COUNT}] Orden No. ${order.number} -> Factura No. ${invoice.number} (Q${total})`);
  }

  console.log(`\nListo: ${created.length} facturas de prueba creadas en estado "pendiente_certificacion".`);
  console.log('Apareceran en /facturacion filtrando por cliente "CLIENTE DE PRUEBA (Digifact - no usar)".');
  process.exitCode = 0;
}

main()
  .catch((err) => {
    console.error('Fallo el seed de facturas de prueba:', err.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
