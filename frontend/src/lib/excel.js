/**
 * Este archivo maneja la "carga masiva" de artículos: en vez de crear los
 * artículos del inventario uno por uno en la pantalla, el usuario puede
 * llenar un archivo de Excel con varios artículos y subirlo de una sola vez.
 * Aquí hay dos funciones: una para generar el Excel de plantilla (vacío, con
 * los encabezados correctos) que el usuario descarga y llena, y otra para
 * leer el Excel que el usuario sube y convertirlo a algo que la app entiende.
 *
 * La plantilla espera estas columnas (encabezados en español, en la primera
 * fila de la hoja): codigo, nombre, tipo, bodega, cantidad, unidad, precio,
 * marca, modelo, ubicacion, descripcion, imagen_url. No importa si están en
 * mayúsculas o con espacios extra, la lectura los tolera igual.
 *
 * Nota técnica: la librería que lee/escribe Excel (xlsx) solo se descarga
 * cuando el usuario realmente usa la carga masiva, para que la app cargue
 * más rápido en el resto de los casos.
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

/** Genera y descarga el archivo Excel de plantilla (encabezados + una fila de ejemplo). */
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

/**
 * Lee el archivo Excel que subió el usuario (la primera hoja) y devuelve una
 * lista de artículos ya en el formato que la app usa internamente. Descarta
 * las filas vacías que no tengan al menos código o nombre.
 */
export async function parseFile(file) {
  const XLSX = await import('xlsx');
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: 'array' });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
  return rows.map(normalizeRow).filter((r) => r.code || r.name);
}

// Toma una fila leída del Excel (con los encabezados en español, como los
// escribió el usuario) y la convierte a los nombres de campo internos de la
// app (en inglés), tolerando mayúsculas o espacios extra en los encabezados.
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
