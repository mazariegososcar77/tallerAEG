// Este archivo guarda y consulta el MATERIAL CONSUMIDO en un reporte de trabajo
// (work_report_items): los repuestos e insumos que realmente se usaron en el trabajo
// -- 10 mts de alambre de cobre, 2 cojinetes, un bote de pintura.
//
// Ojo con no confundirlo con work_order_items, que es otra cosa: aquel es el checklist
// en papel de las piezas con las que ENTRO el equipo, no tiene precio ni vinculo con
// bodega. Este si apunta a un articulo real del inventario y es lo que descuenta stock
// cuando el reporte se finaliza.
//
// Igual que en el kardex, las funciones aceptan un `executor` opcional: el pool para
// una consulta suelta, o la conexion (`conn`) cuando se esta dentro de una transaccion.
import pool from '../lib/db.js';

// Trae el material de un reporte, con los datos del articulo (codigo, nombre, unidad y
// existencia actual) para poder mostrarlo sin consultar el inventario por separado.
export async function findByReportId(reportId, executor = pool) {
  const [rows] = await executor.query(`
    SELECT wri.*, a.code as article_code, a.name as article_name,
           a.unit as article_unit, a.quantity as article_stock
    FROM work_report_items wri
    JOIN articles a ON wri.article_id = a.id
    WHERE wri.work_report_id = ?
    ORDER BY a.name
  `, [reportId]);
  return rows;
}

// Busca una linea de material por su id. Si no existe, devuelve null.
export async function findById(id, executor = pool) {
  const [[row]] = await executor.query('SELECT * FROM work_report_items WHERE id = ?', [id]);
  return row || null;
}

// Busca si un articulo ya esta cargado en un reporte. Sirve para sumarle cantidad en vez
// de intentar insertarlo de nuevo (la tabla no permite el mismo articulo dos veces en el
// mismo reporte).
export async function findByReportAndArticle(reportId, articleId, executor = pool) {
  const [[row]] = await executor.query(
    'SELECT * FROM work_report_items WHERE work_report_id = ? AND article_id = ?',
    [reportId, articleId]
  );
  return row || null;
}

// Agrega una linea de material al reporte.
export async function create(data, executor = pool) {
  const fields = Object.keys(data).join(', ');
  const placeholders = Object.keys(data).map(() => '?').join(', ');
  const [result] = await executor.query(
    `INSERT INTO work_report_items (${fields}) VALUES (${placeholders})`,
    Object.values(data)
  );
  return findById(result.insertId, executor);
}

// Actualiza una linea de material (normalmente su cantidad).
export async function update(id, patch, executor = pool) {
  const fields = Object.keys(patch).map((k) => k + ' = ?').join(', ');
  await executor.query(`UPDATE work_report_items SET ${fields} WHERE id = ?`, [...Object.values(patch), id]);
  return findById(id, executor);
}

// Quita una linea de material del reporte. Devuelve true si si se borro algo.
export async function remove(id, executor = pool) {
  const [result] = await executor.query('DELETE FROM work_report_items WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

/**
 * Congela el costo del material de un reporte tomando el costo de compra que tiene HOY
 * cada articulo (articles.cost). Se llama al finalizar: a partir de ese momento, lo que
 * costo este trabajo queda fijo aunque manana cambie el costo del articulo en el
 * catalogo -- el mismo criterio con el que invoice_items congela los precios de venta.
 *
 * Un articulo sin costo capturado (cost NULL) queda en 0.00: costo desconocido explicito,
 * no se rellena con el precio de venta.
 */
export async function snapshotCosts(reportId, executor = pool) {
  await executor.query(`
    UPDATE work_report_items wri
    JOIN articles a ON wri.article_id = a.id
    SET wri.unit_cost = COALESCE(a.cost, 0),
        wri.subtotal  = ROUND(wri.quantity * COALESCE(a.cost, 0), 2)
    WHERE wri.work_report_id = ?
  `, [reportId]);
}
