// Este archivo guarda y consulta los ARCHIVOS OFICIALES de una factura electrónica (FEL): el
// XML certificado (el documento legal) y el PDF que emite Digifact, tanto de la certificación
// como de la anulación. Viven aparte de `invoices` para que la lista de facturas no cargue
// archivos en cada consulta.
import pool from '../lib/db.js';

// Guarda (o reemplaza) los archivos de una factura para un tipo ('certificacion' / 'anulacion').
export async function save(invoiceId, kind, { xml = null, pdf = null }) {
  if (!xml && !pdf) return;
  await pool.query(
    `INSERT INTO invoice_fel_documents (invoice_id, kind, xml, pdf) VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE xml = VALUES(xml), pdf = VALUES(pdf), created_at = CURRENT_TIMESTAMP`,
    [invoiceId, kind, xml, pdf]
  );
}

// Trae los archivos de una factura para un tipo, o null si no hay.
export async function find(invoiceId, kind = 'certificacion') {
  const [[row]] = await pool.query(
    'SELECT xml, pdf FROM invoice_fel_documents WHERE invoice_id = ? AND kind = ?',
    [invoiceId, kind]
  );
  return row || null;
}
