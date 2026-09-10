/**
 * Es el mensaje que se muestra cuando una lista o búsqueda no tiene ningún
 * resultado que mostrar (por ejemplo, "No hay clientes registrados"), en
 * vez de dejar el espacio en blanco. Puede incluir un ícono decorativo.
 */
export default function EmptyState({ icon: Icon, title, message }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      {Icon && <Icon size={40} className="mb-3 text-slate-300" />}
      <p className="font-medium text-navy-700">{title}</p>
      {message && <p className="mt-1 text-sm text-slate-400">{message}</p>}
    </div>
  );
}
