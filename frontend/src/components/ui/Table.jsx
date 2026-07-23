import Spinner from './Spinner.jsx';

/**
 * Es la tabla que se usa en casi todas las pantallas de listado (Clientes,
 * Inventario, Órdenes, Facturación, etc.). A este componente solo se le
 * dice qué columnas mostrar y qué datos poner en cada fila, y él se encarga
 * de dibujar la tabla, mostrar "Cargando..." mientras trae la información,
 * y mostrar un mensaje cuando no hay ningún registro que mostrar.
 * `renderActions` es opcional: si se usa, agrega una última columna con los
 * botones de acción (ver, editar, eliminar, etc.) de cada fila.
 *
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
    <div className="overflow-x-auto rounded-xl border border-line bg-surface shadow-sm">
      <table className="min-w-full divide-y divide-line text-sm">
        <thead className="bg-surface2">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className="px-4 py-3 text-left font-semibold text-muted whitespace-nowrap"
              >
                {col.header}
              </th>
            ))}
            {renderActions && (
              <th className="px-4 py-3 text-right font-semibold text-muted">Acciones</th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {loading ? (
            <tr>
              <td colSpan={colCount} className="px-4 py-10 text-center text-muted bg-surface">
                <Spinner className="mx-auto text-orange-500" />
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={colCount} className="px-4 py-10 text-center text-muted bg-surface">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row) => (
              <tr key={row[rowKey]} className="hover:bg-hover">
                {columns.map((col) => (
                  <td key={col.key} className={`px-4 py-3 text-content ${col.className || ''}`}>
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
