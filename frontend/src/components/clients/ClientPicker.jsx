import Combobox from '../ui/Combobox.jsx';

/**
 * Selector de cliente con busqueda por nombre / apellido / NIT / DPI y, si el
 * usuario tiene permiso, la opcion "+ Nuevo cliente" (alta rapida).
 * Los clientes aun no validados se marcan con un badge "Pendiente".
 */
export default function ClientPicker({ clients, value, onChange, onCreateNew, canCreate = false, disabled = false }) {
  const options = clients.map((c) => ({
    value: c.id,
    label: c.full_name || c.first_name,
    keywords: `${c.full_name || ''} ${c.first_name || ''} ${c.last_name || ''} ${c.nit || ''} ${c.dpi || ''}`,
    badge: c.is_validated === 0 ? { text: 'Pendiente', color: '#f59e0b' } : undefined,
  }));

  return (
    <Combobox
      value={value}
      onChange={onChange}
      options={options}
      searchable
      disabled={disabled}
      placeholder="Buscar cliente por nombre, NIT o DPI..."
      onCreateNew={canCreate ? onCreateNew : undefined}
      createLabel="Nuevo cliente"
    />
  );
}
