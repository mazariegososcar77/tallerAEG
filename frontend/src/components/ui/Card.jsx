export default function Card({ className = '', children, ...props }) {
  return (
    <div
      className={`rounded-xl border border-navy-600 bg-navy-800 shadow-sm ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
