// Formato de moneda del sistema: "Q." fijo, siempre dos decimales, punto como
// separador (nunca coma). La parte entera nunca queda con un solo digito.
// Ej: 500 -> "Q.500.00" · 500.01 -> "Q.500.01" · 0.5 -> "Q.00.50"
export function formatCurrency(value) {
  const num = Math.abs(Number(value) || 0);
  const cents = Math.round(num * 100);
  const intPart = Math.floor(cents / 100);
  const decPart = cents % 100;
  return `Q.${String(intPart).padStart(2, '0')}.${String(decPart).padStart(2, '0')}`;
}

// Convierte lo que el usuario escribio (numeros y a lo sumo un punto decimal)
// de vuelta a un numero plano, para guardarlo.
export function parseCurrencyInput(raw) {
  const cleaned = String(raw ?? '').replace(/[^0-9.]/g, '');
  const firstDot = cleaned.indexOf('.');
  const normalized = firstDot === -1
    ? cleaned
    : cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, '');
  const num = Number(normalized);
  return Number.isFinite(num) ? num : 0;
}
