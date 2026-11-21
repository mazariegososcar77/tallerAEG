import { useState, useRef } from 'react';
import { Plus, X } from 'lucide-react';
import Input from '../ui/Input.jsx';
import Button from '../ui/Button.jsx';

/**
 * Editor de los CONTACTOS de un cliente: una lista de correo + nombre de quien
 * lo usa (por ejemplo, contabilidad y compras pueden tener correos distintos).
 * Mismo espiritu que ItemListInput (agregar/quitar filas), pero con dos campos
 * por fila en vez de uno solo.
 *
 * `contacts`: [{ email, name }]. `onChange` recibe la lista completa ya
 * actualizada (el padre la reemplaza tal cual, no hace falta ids).
 */
export default function ClientContactsInput({ contacts, onChange, error }) {
  const [draftEmail, setDraftEmail] = useState('');
  const [draftName, setDraftName] = useState('');
  const draftRowRef = useRef(null);

  const add = () => {
    const email = draftEmail.trim();
    if (!email) return;
    onChange([...contacts, { email, name: draftName.trim() }]);
    setDraftEmail('');
    setDraftName('');
  };
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); add(); }
  };
  // Red de seguridad para cuando el usuario escribe el correo (y tal vez el nombre) pero
  // nunca toca "Agregar" -- en el celular es facil escribir y pasar derecho a "Guardar
  // cambios", sin darse cuenta de que ese correo todavia no entro a la lista. Si el foco
  // sale de toda la fila de "Nuevo correo"/"Nombre" (no solo de un campo al otro dentro de
  // la misma fila), se agrega solo. `setTimeout` en vez de `e.relatedTarget` porque en
  // varios navegadores de celular `relatedTarget` llega vacio al tocar con el dedo, y asi
  // se revisa el foco real un instante despues en vez de confiar en ese dato.
  const handleRowBlur = () => {
    setTimeout(() => {
      if (draftRowRef.current && !draftRowRef.current.contains(document.activeElement)) add();
    }, 0);
  };
  const removeAt = (i) => onChange(contacts.filter((_, idx) => idx !== i));
  const updateAt = (i, field, value) => onChange(contacts.map((c, idx) => (idx === i ? { ...c, [field]: value } : c)));

  return (
    <div className="space-y-3">
      {error && <p className="text-sm font-medium text-red-600" role="alert">{error}</p>}
      {contacts.length === 0 ? (
        <p className="text-xs text-slate-500">Aún no hay contactos. Agrega el correo y, si lo sabes, el nombre de quien lo usa.</p>
      ) : (
        <ul className="space-y-2">
          {contacts.map((c, i) => (
            <li key={i} className="flex items-start gap-2">
              <Input
                className="flex-1"
                type="email"
                placeholder="correo@ejemplo.com"
                value={c.email}
                onChange={(e) => updateAt(i, 'email', e.target.value)}
              />
              <Input
                className="flex-1"
                placeholder="Nombre de quien lo usa (opcional)"
                value={c.name}
                onChange={(e) => updateAt(i, 'name', e.target.value)}
              />
              <button
                type="button"
                onClick={() => removeAt(i)}
                className="mt-2 shrink-0 rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                aria-label="Quitar contacto"
              >
                <X size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div ref={draftRowRef} onBlur={handleRowBlur} className="flex items-end gap-2">
        <Input
          className="flex-1"
          label="Nuevo correo"
          type="email"
          placeholder="correo@ejemplo.com"
          value={draftEmail}
          onChange={(e) => setDraftEmail(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <Input
          className="flex-1"
          label="Nombre (opcional)"
          placeholder="Ej: Abdias Gomez"
          value={draftName}
          onChange={(e) => setDraftName(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <Button type="button" variant="outline" onClick={add} disabled={!draftEmail.trim()}>
          <Plus size={16} /> Agregar
        </Button>
      </div>
    </div>
  );
}
