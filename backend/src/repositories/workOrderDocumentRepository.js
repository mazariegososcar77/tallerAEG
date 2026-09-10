// Este archivo guarda y consulta los DOCUMENTOS ADJUNTOS de una orden de trabajo:
// la papeleria de terceros que acompana al trabajo (la factura del taller de
// torneado, un certificado de bobinado, la cotizacion de un proveedor, el recibo
// que mando el cliente por foto).
//
// No confundir con work_report_photos, que es la documentacion fotografica que
// produce el taller en las 4 etapas del reporte. Esto viene de afuera, tiene un
// titulo puesto a mano y puede ser de cualquier formato.
import pool from '../lib/db.js';

// Trae los documentos de una orden, del mas reciente al mas antiguo, con el
// nombre de quien lo subio para no tener que buscarlo aparte.
export async function findByWorkOrderId(workOrderId, executor = pool) {
  const [rows] = await executor.query(`
    SELECT d.*, u.name as uploaded_by_name
    FROM work_order_documents d
    LEFT JOIN users u ON d.uploaded_by = u.id
    WHERE d.work_order_id = ?
    ORDER BY d.created_at DESC, d.id DESC
  `, [workOrderId]);
  return rows;
}

// Busca un documento por su id. Si no existe, devuelve null.
export async function findById(id, executor = pool) {
  const [[row]] = await executor.query('SELECT * FROM work_order_documents WHERE id = ?', [id]);
  return row || null;
}

// Guarda un documento nuevo y devuelve el registro ya creado.
export async function create(data, executor = pool) {
  const fields = Object.keys(data).join(', ');
  const placeholders = Object.keys(data).map(() => '?').join(', ');
  const [result] = await executor.query(
    `INSERT INTO work_order_documents (${fields}) VALUES (${placeholders})`,
    Object.values(data)
  );
  return findById(result.insertId, executor);
}

// Elimina un documento. Devuelve true si si se borro algo, false si no existia.
export async function remove(id, executor = pool) {
  const [result] = await executor.query('DELETE FROM work_order_documents WHERE id = ?', [id]);
  return result.affectedRows > 0;
}
