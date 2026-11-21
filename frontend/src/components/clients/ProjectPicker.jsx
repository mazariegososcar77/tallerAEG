import { useState, useEffect } from 'react';
import { clientProjectsApi } from '../../api/clientProjectsApi.js';
import { notify } from '../../lib/toast.js';
import Combobox from '../ui/Combobox.jsx';
import ProjectFormModal from './ProjectFormModal.jsx';

/**
 * Selector del "sub-proyecto" de UN cliente en particular (ej. un cliente "RETRILLA..."
 * con varios proyectos/sucursales: "Burger King Amatitlan", "Burger King Zona 10"), con
 * alta rapida "+ Nuevo proyecto" -- calcado de MachinePicker.jsx, mismo patron.
 *
 * Existe porque el NIT de un cliente es unico (ver clientService.assertNoDuplicado): no se
 * puede crear un cliente nuevo por cada sucursal que factura bajo el mismo NIT, asi que el
 * proyecto queda como una etiqueta (nombre + ubicacion) dentro del mismo cliente
 * (client_projects, ver 056_client_projects.sql) que se puede elegir al registrar una
 * maquina, una orden de trabajo o una cotizacion.
 *
 * Props:
 * - clientId: cliente al que deben pertenecer los proyectos listados. Si no hay cliente
 *   elegido todavia en el formulario, el selector queda deshabilitado.
 * - value / onChange: el proyecto elegido (id) y como avisar cuando cambia.
 * - disabled: ademas de la regla de arriba (sin cliente), para bloquearlo desde afuera.
 */
export default function ProjectPicker({ clientId, value, onChange, disabled = false }) {
  const [projects, setProjects] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [typedName, setTypedName] = useState('');

  useEffect(() => {
    if (!clientId) { setProjects([]); return; }
    clientProjectsApi.list(clientId).then(setProjects);
  }, [clientId]);

  const options = projects.map((p) => ({
    value: p.id,
    label: p.name + (p.location ? ' - ' + p.location : ''),
    keywords: `${p.name || ''} ${p.location || ''}`,
  }));

  // Si el usuario ya habia escrito algo en el buscador que no coincidio con ningun
  // proyecto, se le propone ese mismo texto como nombre al abrir la ventana de alta.
  const handleCreateNew = (typed) => {
    setTypedName(typed || '');
    setShowCreate(true);
  };

  const handleCreated = (project) => {
    setProjects((prev) => [...prev, project]);
    setShowCreate(false);
    onChange(project.id);
  };

  return (
    <>
      <Combobox
        value={value}
        onChange={onChange}
        options={options}
        searchable
        disabled={disabled || !clientId}
        placeholder={clientId ? 'Buscar proyecto del cliente...' : 'Elige un cliente primero'}
        onCreateNew={clientId ? handleCreateNew : undefined}
        createLabel="Nuevo proyecto"
      />
      <ProjectFormModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        clientId={clientId}
        defaultName={typedName}
        onSaved={handleCreated}
      />
    </>
  );
}
