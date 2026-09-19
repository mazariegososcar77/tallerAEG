// Este archivo guarda los CONTACTOS de un cliente: correo + nombre de la persona
// dueña de ese correo. Un cliente puede tener varios (por ejemplo, contabilidad y
// compras con correos distintos). Cuelgan de clients.id (client_id).
import pool from '../lib/db.js';

// Trae los contactos de un cliente especifico, del mas viejo al mas nuevo (el
// orden en que se fueron agregando).
export async function findByClientId(clientId) {
  const [rows] = await pool.query(
    'SELECT * FROM client_contacts WHERE client_id = ? ORDER BY id',
    [clientId],
  );
  return rows;
}

// Reemplaza por completo la lista de contactos de un cliente: borra los que tenia
// y guarda los que llegan (asi no hay que calcular cuales agregar/editar/quitar uno
// por uno cada vez que se edita el cliente) -- mismo patron que
// articlePieceRepository.replaceForArticle.
export async function replaceForClient(clientId, contacts = []) {
  await pool.query('DELETE FROM client_contacts WHERE client_id = ?', [clientId]);
  const clean = contacts
    .map((c) => ({ email: (c.email || '').trim(), name: (c.name || '').trim() }))
    .filter((c) => c.email);
  if (clean.length > 0) {
    const values = clean.map((c) => [clientId, c.email, c.name]);
    await pool.query('INSERT INTO client_contacts (client_id, email, name) VALUES ?', [values]);
  }
}
