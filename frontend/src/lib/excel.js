/**
 * Utilidades de Excel (SheetJS) para la carga masiva de articulos.
 * xlsx se importa de forma diferida para no inflar el bundle inicial:
 * solo se descarga cuando el usuario usa la carga masiva.
 */

// Encabezados de la plantilla (en espanol) y su mapeo al modelo interno.
const HEADER_MAP = {
  codigo: 'code',
  nombre: 'name',
  tipo: 'type',
  bodega: 'warehouse',
  cantidad: 'quantity',
  unidad: 'unit',
  precio: 'price',
  marca: 'brand',
  modelo: 'model',
  ubicacion: 'location',
  descripcion: 'description',
  imagen_url: 'image_url',
};

const COLUMNS = Object.keys(HEADER_MAP);

/** Descarga una plantilla .xlsx con los encabezados y una fila de ejemplo. */
export async function downloadTemplate() {
  const XLSX = await import('xlsx');
  const example = {
    codigo: 'MAQ-010',
    nombre: 'Ejemplo de articulo',
    tipo: 'Maquina',
    bodega: 'Bodega Central',
    cantidad: 1,
    unidad: 'unidad',
    precio: 1000,
    marca: 'AEG',
    modelo: 'X-1',
    ubicacion: 'Estante A',
    descripcion: 'Descripcion opcional',
    imagen_url: 'https://ejemplo.com/imagen.jpg',
  };
  const ws = XLSX.utils.json_to_sheet([example], { header: COLUMNS });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Articulos');
  XLSX.writeFile(wb, 'plantilla_inventario.xlsx');
}

/** Lee un archivo .xlsx y devuelve filas normalizadas al modelo interno. */
export async function parseFile(file) {
  const XLSX = await import('xlsx');
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: 'array' });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
  return rows.map(normalizeRow).filter((r) => r.code || r.name);
}

function normalizeRow(raw) {
  const out = {};
  const keys = Object.keys(raw);
  for (const [es, en] of Object.entries(HEADER_MAP)) {
    // tolera encabezados con mayusculas o espacios extra
    const match = keys.find((k) => k.trim().toLowerCase() === es);
    out[en] = match !== undefined ? raw[match] : '';
  }
  return out;
}
