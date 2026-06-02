import { Check } from 'lucide-react';

// Paleta de colores sugeridos (mas la opcion personalizada al final).
const PRESETS = [
  '#16285C', // navy marca
  '#E8551C', // naranja marca
  '#2563EB', // azul
  '#0891B2', // cian
  '#059669', // verde
  '#CA8A04', // amarillo
  '#DC2626', // rojo
  '#7C3AED', // morado
  '#DB2777', // rosa
  '#475569', // gris
];

/** Selector de color: paleta de presets + un selector personalizado. value/onChange en #RRGGBB. */
export default function ColorPicker({ label, value, onChange }) {
  const current = (value || '').toLowerCase();
  const isCustom = current && !PRESETS.includes(current);

  return (
    <div>
      {label && <p className="mb-1 block text-sm font-medium text-navy-800">{label}</p>}
      <div className="flex flex-wrap items-center gap-2">
        {PRESETS.map((color) => {
          const selected = current === color;
          return (
            <button
              key={color}
              type="button"
              title={color}
              onClick={() => onChange(color)}
              style={{ backgroundColor: color }}
              className={`flex h-7 w-7 items-center justify-center rounded-full transition
                ${selected ? 'ring-2 ring-navy-400 ring-offset-2' : 'hover:scale-110'}`}
            >
              {selected && <Check size={14} className="text-white" />}
            </button>
          );
        })}

        {/* Color personalizado (input nativo de color, presentado como circulo) */}
        <label
          title="Color personalizado"
          style={{ backgroundColor: isCustom ? current : '#ffffff' }}
          className={`relative flex h-7 w-7 cursor-pointer items-center justify-center overflow-hidden
            rounded-full border border-dashed border-slate-400 text-[10px] font-bold text-slate-500
            ${isCustom ? 'ring-2 ring-navy-400 ring-offset-2' : ''}`}
        >
          {!isCustom && '+'}
          <input
            type="color"
            value={current || '#000000'}
            onChange={(e) => onChange(e.target.value)}
            className="absolute -inset-1 cursor-pointer opacity-0"
          />
        </label>
      </div>
    </div>
  );
}
