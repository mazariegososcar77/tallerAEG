import * as quoteRepository from '../repositories/quoteRepository.js';
import { ApiError } from '../utils/ApiError.js';

function normalize(data) {
  if (data.discount === '' || data.discount === undefined) data.discount = 0;
  if (data.subtotal === '' || data.subtotal === undefined) data.subtotal = 0;
  if (data.total === '' || data.total === undefined) data.total = 0;
  if (data.valid_until === '') data.valid_until = null;
  if (data.work_type === '') data.work_type = null;
  if (data.observations === '') data.observations = null;
  if (data.equipment_data === undefined) data.equipment_data = null;
  return data;
}

function calcTotals(items, discount) {
  const subtotal = items.reduce((s, i) => s + (parseFloat(i.quantity) || 1) * (parseFloat(i.unit_price) || 0), 0);
  const total = subtotal - (parseFloat(discount) || 0);
  return { subtotal, total };
}

export async function list() {
  return quoteRepository.getAll();
}

export async function getById(id) {
  const quote = await quoteRepository.findById(id);
  if (!quote) throw new ApiError(404, 'Cotización no encontrada');
  return quote;
}

export async function create({ items, ...data }) {
  const number = await quoteRepository.getNextNumber();
  normalize(data);
  if (items && items.length > 0) {
    const { subtotal, total } = calcTotals(items, data.discount);
    data.subtotal = subtotal;
    data.total = total;
  }
  return quoteRepository.create({ ...data, number }, items || []);
}

export async function update(id, { items, ...data }) {
  const existing = await quoteRepository.findById(id);
  if (!existing) throw new ApiError(404, 'Cotización no encontrada');
  normalize(data);
  if (items && items.length > 0) {
    const { subtotal, total } = calcTotals(items, data.discount);
    data.subtotal = subtotal;
    data.total = total;
  }
  return quoteRepository.update(id, data, items);
}

export async function updateStatus(id, status) {
  const existing = await quoteRepository.findById(id);
  if (!existing) throw new ApiError(404, 'Cotización no encontrada');
  return quoteRepository.update(id, { status });
}

export async function remove(id) {
  const existing = await quoteRepository.findById(id);
  if (!existing) throw new ApiError(404, 'Cotización no encontrada');
  return quoteRepository.remove(id);
}
