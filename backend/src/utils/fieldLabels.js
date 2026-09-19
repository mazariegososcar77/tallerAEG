// Nombres en español de los campos, tal como los ve el usuario en las pantallas. Sirven para
// armar mensajes de error que digan A QUE campo se refieren ("Teléfono: debe tener 8 números")
// en vez de un "Datos inválidos" genérico.

const LABELS = {
  // personas / clientes
  name: 'Nombre', first_name: 'Nombre', last_name: 'Apellido', full_name: 'Nombre',
  nit: 'NIT', dpi: 'DPI', phone: 'Teléfono', email: 'Correo electrónico', address: 'Dirección',
  trade_name: 'Nombre comercial', contact_name: 'Contacto principal', dependency: 'Dependencia',
  client_type_id: 'Tipo de cliente', loyalty_tier_id: 'Nivel de fidelización', client_id: 'Cliente',
  contacts: 'Contactos',
  // catálogos
  description: 'Descripción', color: 'Color', prefix: 'Prefijo', icon: 'Ícono', category: 'Categoría',
  discount: 'Descuento', benefits: 'Beneficios', is_active: 'Activo',
  // usuarios y roles
  password: 'Contraseña', role_id: 'Rol', permissions: 'Permisos',
  // inventario
  code: 'Código', type_id: 'Tipo', warehouse_id: 'Bodega', quantity: 'Cantidad', min_stock: 'Existencia mínima',
  unit: 'Unidad', price: 'Precio de venta', cost: 'Precio de compra', brand: 'Marca', model: 'Modelo',
  location: 'Ubicación', image_url: 'Imagen', pieces: 'Piezas', labor: 'Mano de obra', article_id: 'Artículo',
  // documentos
  number: 'Número', date: 'Fecha', valid_until: 'Válida hasta', status: 'Estado', reason: 'Motivo',
  general_notes: 'Notas generales', stage_notes: 'Notas de las etapas', serial: 'Serie', message: 'Mensaje',
  document_type: 'Tipo de documento', digits: 'Dígitos', next_number: 'Siguiente número',
  // configuración
  company_name: 'Nombre del taller', theme_default: 'Tema', quote_valid_days: 'Días de vigencia',
  n8n_webhook_url: 'URL del webhook de n8n', notif_daily_hour: 'Hora de la revisión diaria',
};

/**
 * Etiqueta legible de una ruta de zod, por ejemplo:
 *   ['phone']                  -> "Teléfono"
 *   ['contacts', 0, 'email']   -> "Correo del contacto 1"
 *   ['items', 2, 'quantity']   -> "Cantidad (línea 3)"
 */
export function labelForPath(path = []) {
  if (!path.length) return 'Los datos';
  const last = String(path[path.length - 1]);
  const index = path.find((p) => typeof p === 'number');

  if (path[0] === 'contacts' && index !== undefined) {
    const n = index + 1;
    if (last === 'email') return `Correo del contacto ${n}`;
    if (last === 'name') return `Nombre del contacto ${n}`;
    return `Contacto ${n}`;
  }
  const base = LABELS[last] || last.replace(/_/g, ' ');
  const capitalized = base.charAt(0).toUpperCase() + base.slice(1);
  return index !== undefined ? `${capitalized} (línea ${index + 1})` : capitalized;
}

/** Etiqueta de una columna de la base de datos (para los errores de MySQL). */
export function labelForColumn(column) {
  if (!column) return null;
  return LABELS[column] || null;
}
