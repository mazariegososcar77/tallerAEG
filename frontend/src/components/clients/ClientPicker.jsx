import Combobox from '../ui/Combobox.jsx';

/**
 * Selector de cliente con busqueda por nombre / apellido / NIT / DPI y, si el
 * usuario tiene permiso, la opcion "+ Nuevo cliente" (alta rapida).
 * Los clientes aun no validados se marcan con un badge "Pendiente".
 *
 * Este componente es el cuadro de busqueda de cliente que aparece dentro de
 * Cotizaciones y Ordenes de Trabajo. El usuario escribe parte del nombre, NIT
 * o DPI y elige de la lista; si no encuentra al cliente, puede crearlo ahi
 * mismo sin salir de la pantalla (opcion "Nuevo cliente", si tiene permiso).
 *
 * Props:
 * - clients: la lista completa de clientes disponibles para elegir.
 * - value / onChange: el cliente seleccionado actualmente y como avisar cuando cambia.
 * - onCreateNew: que hacer cuando el usuario aprieta "Nuevo cliente".
 * - canCreate: si se debe mostrar la opcion de crear un cliente nuevo.
 * - disabled: si el selector debe estar bloqueado (no se puede usar).
 */
export default function ClientPicker({ clients, value, onChange, onCreateNew, canCreate = false, disabled = false }) {
  // Convierte cada cliente en una "opcion" que el buscador entiende: el texto
  // que se ve (label), las palabras por las que se puede encontrar (keywords)
  // y una etiqueta de color "Pendiente" si el cliente todavia no fue validado.
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
