import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import Input from '../ui/Input.jsx';
import Button from '../ui/Button.jsx';

const SCROLL_THRESHOLD = 10;

/**
 * Editor de una lista de nombres (string[]). Cada Enter (o el boton Agregar) inserta un item;
 * la lista se muestra debajo y al superar 10 items aparece scroll.
 * Reutilizable para Piezas y Mano de obra via props de texto/icono.
 *
 * En palabras simples: es una lista donde el usuario va escribiendo textos
 * cortos, uno por uno (por ejemplo, la lista de piezas usadas o el listado de
 * mano de obra realizada), y cada uno queda como un renglon numerado que se
 * puede quitar despues con el boton de la "X".
 */
export default function ItemListInput({
  items,
  onChange,
  label = 'Agregar elemento',
  placeholder = 'Escribe y presiona Enter',
  emptyText = 'Aún no hay elementos.',
  emptyIcon = null,
}) {
  const [draft, setDraft] = useState(''); // lo que el usuario esta escribiendo antes de agregarlo a la lista

  // Agrega el texto escrito a la lista (si no esta vacio) y limpia el campo.
  const add = () => {
    const name = draft.trim();
    if (!name) return;
    onChange([...items, name]);
    setDraft('');
  };

  // Permite agregar el elemento presionando la tecla Enter, sin necesidad de
  // hacer clic en el boton "Agregar".
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      add();
    }
  };

  // Quita de la lista el elemento en la posicion indicada.
  const removeAt = (index) => onChange(items.filter((_, i) => i !== index));

  const scrollable = items.length > SCROLL_THRESHOLD;

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-2">
        <Input
          className="flex-1"
          label={label}
          placeholder={placeholder}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <Button type="button" variant="outline" onClick={add} disabled={!draft.trim()}>
          <Plus size={16} /> Agregar
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-slate-200 py-10 text-slate-400">
          {emptyIcon}
          <p className="text-sm">{emptyText}</p>
        </div>
      ) : (
        <ul className={`space-y-1.5 ${scrollable ? 'max-h-[26rem] overflow-y-auto pr-1' : ''}`}>
          {items.map((name, i) => (
            <li
              key={`${name}-${i}`}
              className="flex items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2"
            >
              <span className="inline-flex items-center gap-2 text-sm text-navy-800">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-navy-100 text-xs font-semibold text-navy-700">
                  {i + 1}
                </span>
                {name}
              </span>
              <button
                type="button"
                onClick={() => removeAt(i)}
                className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                aria-label={`Quitar ${name}`}
              >
                <X size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
