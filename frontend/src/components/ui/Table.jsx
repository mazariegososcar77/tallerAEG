import Spinner from './Spinner.jsx';

/**
 * Tabla reutilizable basada en configuracion.
 * columns: [{ key, header, render?(row), className? }]
 * renderActions?(row): celda de acciones al final
 */
export default function Table({
  columns,
  data,
  rowKey = 'id',
  renderActions,
  loading = false,
  emptyMessage = 'No hay registros.',
}) {
  const colCount = columns.length + (renderActions ? 1 : 0);

  return (
    <div className="overflow-x-auto rounded-xl border border-navy-600 bg-navy-800 shadow-sm">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-navy-900">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className="px-4 py-3 text-left font-semibold text-slate-300 whitespace-nowrap"
              >
                {col.header}
              </th>
            ))}
            {renderActions && (
              <th className="px-4 py-3 text-right font-semibold text-slate-300">Acciones</th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-navy-600">
          {loading ? (
            <tr>
              <td colSpan={colCount} className="px-4 py-10 text-center text-slate-400 bg-navy-800">
                <Spinner className="mx-auto text-orange-500" />
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={colCount} className="px-4 py-10 text-center text-slate-400 bg-navy-800">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row) => (
              <tr key={row[rowKey]} className="hover:bg-navy-700">
                {columns.map((col) => (
                  <td key={col.key} className={`px-4 py-3 text-slate-200 ${col.className || ''}`}>
                    {col.render ? col.render(row) : row[col.key]}
                  </td>
                ))}
                {renderActions && (
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">{renderActions(row)}</div>
                  </td>
                )}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
