// Este archivo maneja los CLIENTES del taller: verlos, crearlos, editarlos,
// eliminarlos, y la regla de "cliente validado" (que un administrador confirmo que
// sus datos son correctos, sobre todo cuando se dio de alta rapido desde una orden
// o cotizacion).
import * as clientRepository from '../repositories/clientRepository.js';
import * as clientContactRepository from '../repositories/clientContactRepository.js';
import * as machineRepository from '../repositories/machineRepository.js';
import * as quoteRepository from '../repositories/quoteRepository.js';
import * as workOrderRepository from '../repositories/workOrderRepository.js';
import * as serviceOrderRepository from '../repositories/serviceOrderRepository.js';
import * as invoiceRepository from '../repositories/invoiceRepository.js';
import { ApiError } from '../utils/ApiError.js';

// Limpia los datos del cliente antes de guardarlos: si un campo opcional (NIT, DPI,
// correo, nombre comercial, etc.) llega vacio, se guarda como "sin dato" en vez de
// como texto vacio, para no confundir "no tiene" con "escribieron nada".
function normalize(data) {
  // last_name NO se incluye: es obligatorio (NOT NULL); si va vacío se guarda como ''.
  const nullIfEmpty = ['nit', 'dpi', 'company_name', 'trade_name', 'contact_name', 'dependency'];
  const result = { ...data };
  for (const key of nullIfEmpty) {
    if (result[key] !== undefined && result[key] !== null && String(result[key]).trim() === '') {
      result[key] = null;
    }
  }
  return result;
}

// Devuelve la lista completa de clientes.
export async function list() {
  return clientRepository.getAll();
}

// Busca un cliente por id. Si no existe, avisa con un error.
export async function getById(id) {
  const c = await clientRepository.findById(id);
  if (!c) throw new ApiError(404, 'Cliente no encontrado');
  return c;
}

// Da de alta un cliente nuevo desde la pantalla de Clientes. "contacts" (correo +
// nombre de cada persona de contacto) no es una columna de "clients" -- vive en su
// propia tabla (client_contacts), asi que se separa del resto y se guarda aparte,
// igual que "pieces"/"labor" en articleService.create.
export async function create({ contacts, ...data }) {
  // is_validated no viaja en el payload (el schema zod lo descarta); la columna
  // usa su DEFAULT (1), asi que las altas del modulo Clientes entran validadas.
  const created = await clientRepository.create(normalize(data));
  if (contacts !== undefined) await clientContactRepository.replaceForClient(created.id, contacts);
  return clientRepository.findById(created.id);
}

// Alta "de ultima instancia" desde el selector de Ordenes/Cotizaciones: el
// cliente puede usarse de inmediato pero entra SIN validar para que un
// administrador revise sus datos despues.
export async function quickCreate({ contacts, ...data }) {
  const created = await clientRepository.create({ ...normalize(data), is_validated: 0 });
  if (contacts !== undefined) await clientContactRepository.replaceForClient(created.id, contacts);
  return clientRepository.findById(created.id);
}

// Arma el "historial de equipo" de un cliente ("expediente" del cliente, ver plan de la
// sesion): sus maquinas registradas, mas las cotizaciones/ordenes de trabajo/visitas de
// servicio de ese cliente (el frontend agrupa las que tienen machine_id bajo su maquina, y
// deja las que no bajo "Sin equipo asociado" -- ver ClientHistoryPage.jsx), y el total
// historico facturado. Es un ensamblado de repositorios que ya existen, no hay tabla nueva.
export async function getHistory(id) {
  const client = await clientRepository.findById(id);
  if (!client) throw new ApiError(404, 'Cliente no encontrado');
  const [machines, quotes, workOrders, serviceOrders, invoices] = await Promise.all([
    machineRepository.getAll(id),
    quoteRepository.getAll(id),
    workOrderRepository.getAll(id),
    serviceOrderRepository.getAll(id),
    invoiceRepository.getAll(id),
  ]);
  const totalBilled = invoices
    .filter(inv => inv.status !== 'anulada')
    .reduce((sum, inv) => sum + Number(inv.total || 0), 0);
  return { client, machines, quotes, workOrders, serviceOrders, invoices, totalBilled };
}

// Marca un cliente como validado tras la revision del administrador.
export async function validate(id) {
  const existing = await clientRepository.findById(id);
  if (!existing) throw new ApiError(404, 'Cliente no encontrado');
  return clientRepository.update(id, { is_validated: 1 });
}

// Edita los datos de un cliente existente (y, si vienen, reemplaza por completo su
// lista de contactos -- ver create).
export async function update(id, { contacts, ...patch }) {
  const existing = await clientRepository.findById(id);
  if (!existing) throw new ApiError(404, 'Cliente no encontrado');
  if (contacts !== undefined) await clientContactRepository.replaceForClient(id, contacts);
  if (Object.keys(patch).length === 0) return clientRepository.findById(id);
  return clientRepository.update(id, normalize(patch));
}

// Elimina un cliente.
export async function remove(id) {
  const existing = await clientRepository.findById(id);
  if (!existing) throw new ApiError(404, 'Cliente no encontrado');
  return clientRepository.remove(id);
}
