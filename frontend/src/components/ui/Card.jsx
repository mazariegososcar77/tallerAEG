// Es solo una "tarjeta" con borde redondeado y sombra suave, usada como
// contenedor visual para agrupar información en muchas pantallas (por
// ejemplo, envolver una tabla o un formulario). No tiene lógica propia.
export default function Card({ className = '', children, ...props }) {
  return (
    <div
      className={`rounded-xl border border-line bg-surface shadow-sm ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
