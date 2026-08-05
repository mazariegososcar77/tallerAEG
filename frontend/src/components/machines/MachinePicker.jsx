import { useState, useEffect } from 'react';
import { machinesApi } from '../../api/machinesApi.js';
import Combobox from '../ui/Combobox.jsx';
import MachineFormModal from './MachineFormModal.jsx';

/**
 * Selector de maquina (equipo) de UN cliente en particular, con la opcion
 * "+ Nueva maquina" (alta rapida sin salir de la pantalla) -- calcado de
 * ClientPicker.jsx, mismo patron.
 *
 * Es el que amarra Cotizaciones/Ordenes de Trabajo/Ordenes de Servicio al
 * catalogo de Maquinas (ver 031_client_equipment_history.sql): al elegir una
 * maquina existente, el que la usa puede autocompletar marca/modelo/serie y
 * guardar el machine_id -- asi esa reparacion queda en la linea de tiempo de
 * ese equipo especifico (ver ClientHistoryPage.jsx). Si el usuario prefiere
 * seguir escribiendo el equipo a mano (como siempre se hizo), no pasa nada:
 * el formulario sigue funcionando igual, solo que sin quedar amarrado.
 *
 * Props:
 * - clientId: cliente al que deben pertenecer las maquinas listadas. Si no
 *   hay cliente elegido todavia en el formulario, el selector queda deshabilitado.
 * - clients: la lista completa de clientes (la misma que ya usa el ClientPicker del
 *   formulario donde se usa este componente) -- se la pasa al MachineFormModal de
 *   "+ Nueva máquina" para que su propio ClientPicker muestre los nombres bien.
 * - value / onChange: la maquina elegida (id) y como avisar cuando cambia.
 * - onMachineLoaded(machine): opcional, se llama con el registro completo de
 *   la maquina elegida/creada (para que quien lo use autocomplete marca/modelo/serie).
 */
export default function MachinePicker({ clientId, clients = [], value, onChange, onMachineLoaded, disabled = false }) {
  const [machines, setMachines] = useState([]);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    if (!clientId) { setMachines([]); return; }
    machinesApi.list(clientId).then(setMachines);
  }, [clientId]);

  const options = machines.map((m) => ({
    value: m.id,
    label: m.name + (m.brand ? ' - ' + m.brand : ''),
    keywords: `${m.name || ''} ${m.brand || ''} ${m.model || ''} ${m.serial || ''}`,
  }));

  const handleChange = (id) => {
    onChange(id);
    const machine = machines.find(m => String(m.id) === String(id));
    if (machine) onMachineLoaded?.(machine);
  };

  const handleCreated = (machine) => {
    setMachines(prev => [...prev, machine]);
    setShowCreate(false);
    handleChange(machine.id);
  };

  return (
    <>
      <Combobox
        value={value}
        onChange={handleChange}
        options={options}
        searchable
        disabled={disabled || !clientId}
        placeholder={clientId ? 'Buscar maquina del cliente...' : 'Elige un cliente primero'}
        onCreateNew={clientId ? () => setShowCreate(true) : undefined}
        createLabel="Nueva máquina"
      />
      <MachineFormModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onSaved={handleCreated}
        clients={clients}
        defaultClientId={clientId}
      />
    </>
  );
}
