import * as workOrderRepository from '../repositories/workOrderRepository.js';
import { ApiError } from '../utils/ApiError.js';

export async function list() {
  return workOrderRepository.getAll();
}

export async function getById(id) {
  const order = await workOrderRepository.findById(id);
  if (!order) throw new ApiError(404, 'Orden de trabajo no encontrada');
  return order;
}

export async function create({ items, ...data }) {
  const number = await workOrderRepository.getNextNumber();
  if (data.total === '' || data.total === null || data.total === undefined) data.total = 0;
  if (data.kw === '') data.kw = null;
  if (data.rpm === '') data.rpm = null;
  if (data.hp === '') data.hp = null;
  return workOrderRepository.create({ ...data, number }, items);
}

export async function update(id, { items, ...data }) {
  const existing = await workOrderRepository.findById(id);
  if (!existing) throw new ApiError(404, 'Orden de trabajo no encontrada');
  return workOrderRepository.update(id, data, items);
}

export async function updateStatus(id, status) {
  const existing = await workOrderRepository.findById(id);
  if (!existing) throw new ApiError(404, 'Orden de trabajo no encontrada');
  return workOrderRepository.update(id, { status });
}

export async function remove(id) {
  const existing = await workOrderRepository.findById(id);
  if (!existing) throw new ApiError(404, 'Orden de trabajo no encontrada');
  return workOrderRepository.remove(id);
}
