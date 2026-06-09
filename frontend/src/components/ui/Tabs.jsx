/**
 * Barra de pestañas controlada. El consumidor renderiza el contenido según `active`.
 * tabs: [{ key, label, icon?, count? }]
 */
export default function Tabs({ tabs, active, onChange, className = '' }) {
  return (
    <div className={`flex gap-1 border-b border-slate-200 ${className}`}>
      {tabs.map((tab) => {
        const isActive = tab.key === active;
        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onChange(tab.key)}
            className={`-mb-px inline-flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors focus-brand
              ${isActive
                ? 'border-orange-500 text-navy-800'
                : 'border-transparent text-slate-500 hover:text-navy-700'}`}
          >
            {tab.icon}
            {tab.label}
            {typeof tab.count === 'number' && (
              <span
                className={`rounded-full px-1.5 text-xs font-semibold
                  ${isActive ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-500'}`}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
