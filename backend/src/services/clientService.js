/** Logica de negocio de clientes (CRUD). */
import * as clientRepository from '../repositories/clientRepository.js';
import * as clientTypeRepository from '../repositories/clientTypeRepository.js';
import * as loyaltyTierRepository from '../repositories/loyaltyTierRepository.js';
import { ApiError } from '../utils/ApiError.js';

/** Forma publica: agrega el nombre del tipo y los datos del nivel de fidelizacion. */
function toPublic(client) {
  const type = client.client_type_id ? clientTypeRepository.findById(client.client_type_id) : null;
  const tier = client.loyalty_tier_id ? loyaltyTierRepository.findById(client.loyalty_tier_id) : null;
  return {
    ...client,
    full_name: `${client.first_name} ${client.last_name}`.trim(),
    client_type_name: type ? type.name : null,
    loyalty_tier_name: tier ? tier.name : null,
    loyalty_tier_color: tier ? tier.color : null,
    loyalty_tier_icon: tier ? tier.icon : null,
    loyalty_discount: tier ? tier.discount : null,
    loyalty_benefits: tier ? tier.benefits : null,
  };
}

/** Al menos uno de NIT/DPI debe venir (solo uno de los dos puede quedar vacio). */
function assertIdentifiers(nit, dpi) {
  if (!String(nit || '').trim() && !String(dpi || '').trim()) {
    throw new ApiError(400, 'Debe indicar al menos el NIT o el DPI', [
      { field: 'nit', message: 'Indique NIT o DPI' },
      { field: 'dpi', message: 'Indique NIT o DPI' },
    ]);
  }
}

/** Valida que el tipo y el nivel de fidelizacion existan (cuando se envian). */
function assertRefs(typeId, tierId) {
  if (typeId != null && !clientTypeRepository.findById(typeId)) {
    throw new ApiError(400, 'El tipo de cliente no existe');
  }
  if (tierId != null && !loyaltyTierRepository.findById(tierId)) {
    throw new ApiError(400, 'El nivel de fidelizacion no existe');
  }
}

function assertUniqueIdentifiers(nit, dpi, ignoreId = null) {
  if (String(nit || '').trim()) {
    const clash = clientRepository.findByNit(nit);
    if (clash && clash.id !== ignoreId) throw new ApiError(409, 'Ya existe un cliente con ese NIT');
  }
  if (String(dpi || '').trim()) {
    const clash = clientRepository.findByDpi(dpi);
    if (clash && clash.id !== ignoreId) throw new ApiError(409, 'Ya existe un cliente con ese DPI');
  }
}

export function list() {
  return clientRepository.getAll().map(toPublic);
}

export function getById(id) {
  const client = clientRepository.findById(id);
  if (!client) throw new ApiError(404, 'Cliente no encontrado');
  return toPublic(client);
}

export function create(data) {
  assertIdentifiers(data.nit, data.dpi);
  assertUniqueIdentifiers(data.nit, data.dpi);
  assertRefs(data.client_type_id ?? null, data.loyalty_tier_id ?? null);
  return toPublic(clientRepository.create(data));
}

export function update(id, data) {
  const existing = clientRepository.findById(id);
  if (!existing) throw new ApiError(404, 'Cliente no encontrado');

  const nit = data.nit ?? existing.nit;
  const dpi = data.dpi ?? existing.dpi;
  assertIdentifiers(nit, dpi);
  assertUniqueIdentifiers(data.nit, data.dpi, existing.id);

  const typeId = data.client_type_id !== undefined ? data.client_type_id : existing.client_type_id;
  const tierId = data.loyalty_tier_id !== undefined ? data.loyalty_tier_id : existing.loyalty_tier_id;
  assertRefs(typeId, tierId);

  const patch = { ...data };
  if (patch.first_name !== undefined) patch.first_name = patch.first_name.trim();
  if (patch.last_name !== undefined) patch.last_name = patch.last_name.trim();
  if (patch.phone !== undefined) patch.phone = patch.phone.trim();
  return toPublic(clientRepository.update(id, patch));
}

export function remove(id) {
  if (!clientRepository.findById(id)) throw new ApiError(404, 'Cliente no encontrado');
  clientRepository.remove(id);
}
