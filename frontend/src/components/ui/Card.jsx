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
