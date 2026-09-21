// Definicion del TALONARIO fisico A.E.G. (Orden de Trabajo): los campos, sus
// etiquetas y su ORDEN, tal cual estan impresos en el papel. Lo usa el formulario
// de la Orden de Trabajo (Pre y Post) y, despues, el de la Orden de Servicio -- asi
// los dos nunca se separan del papel.
//
// Los grupos de casillas y las tablas se guardan como JSON en la orden (mismo
// patron de siempre); las funciones normalize* de abajo convierten al formato
// nuevo lo que se guardo con el formato viejo, para que las ordenes ya hechas
// sigan abriendose.

// Trabajo a realizar. Extraccion de lodo va aparte, mas abajo en el papel.
export const WORK_CHECKS = [
  { value: 'rebobinado', label: 'Rebobinado' },
  { value: 'cambio_conexion', label: 'Cambio conexión' },
  { value: 'calculo_voltaje', label: 'Cálculo de voltaje' },
  { value: 'mantenimiento', label: 'Mantenimiento' },
  { value: 'extraccion_humedad', label: 'Extracción de humedad' },
];
export const LODO_CHECKS = [
  { value: 'extraccion_lodo_8m3', label: '8 mts³' },
  { value: 'extraccion_lodo_12m3', label: '12 mts³' },
];

// Tipo de equipo (casillas), en el orden del papel.
export const EQUIPMENT_CHECKS = [
  { value: 'motor_trifasico', label: 'Motor trifásico' },
  { value: 'motor_monofasico', label: 'Motor monofásico' },
  { value: 'motor_ventilador', label: 'Motor ventilador' },
  { value: 'motor_reductor', label: 'Motor reductor' },
  { value: 'bomba_sumergible', label: 'Bomba sumergible' },
  { value: 'bomba_centrifuga', label: 'Bomba centrífuga' },
  { value: 'blower', label: 'Blower' },
  { value: 'generador', label: 'Generador' },
];
export const AIREADOR_SIZES = [
  { value: '1.5Kw', label: '1.5 Kw' }, { value: '2Hp', label: '2Hp' }, { value: '2.2Kw', label: '2.2 Kw' },
  { value: '3Hp', label: '3Hp' }, { value: '3.7Kw', label: '3.7 Kw' }, { value: '5Hp', label: '5Hp' },
];

export const PHYSICAL_CHECKS = [
  { value: 'variador', label: 'Variador' }, { value: 'estator', label: 'Estator' },
  { value: 'rotor', label: 'Rotor' }, { value: 'otros', label: 'Otros' },
];

export const PUMP_SEAL_TYPES = [
  { value: 'viton', label: 'Vitón' }, { value: 'nitrilo', label: 'Nitrilo' }, { value: 'conico', label: 'Cónico' },
];

// Componentes: mismo orden que el papel (tres columnas: 7 + 7 + 6). El nombre es lo
// que se guarda en work_order_items.name.
export const DEFAULT_ITEMS = [
  'Polea', 'Caja de conexion', 'Tapa de conexion', 'Bornera', 'Argolla', 'Ventilador', 'Lazo',
  'Tolva', 'Placa de datos', 'Impulsor', 'Difusor', 'Housing de impulsor', 'Caja reductora', 'Cadena',
  'Tapa capacitor', 'Base quebrada de motor', 'Tapas quebradas', 'Capacitores', 'Cuña', 'Retenedor',
];
export const COMPONENT_COLUMNS = [DEFAULT_ITEMS.slice(0, 7), DEFAULT_ITEMS.slice(7, 14), DEFAULT_ITEMS.slice(14)];

// Tornillos: `part` es la llave que se guarda (la misma de siempre, la usa el PDF);
// `label` es como se lee en el papel.
export const SCREW_ROWS = [
  { part: 'Motor', label: 'Tornillos de motor' },
  { part: 'Tolva', label: 'Tornillos de tolva' },
  { part: 'Caja de conexión', label: 'Tornillos de caja de conexión' },
  { part: 'Tapa de conexión', label: 'Tornillos de tapa de conexión' },
  { part: 'Bornera', label: 'Tornillos de bornera' },
  { part: 'Bomba', label: 'Tornillos de bomba' },
  { part: 'Retén cojinete delantero', label: 'Tornillos Reten. coj. delantero' },
  { part: 'Retén cojinete trasero', label: 'Tornillos Reten. coj. trasero' },
  { part: 'Impulsor', label: 'Tornillo Impulsor' },
  { part: 'Turbina', label: 'Tornillo Turbina' },
  { part: 'Castigadores de polea', label: 'Castigadores de polea' },
  { part: 'Roldanas tornillo impulsor', label: 'Roldanas tornillo impulsor' },
  { part: 'Tuercas', label: 'Tuercas' },
  { part: 'Washas', label: 'Washas' },
];
export const emptyScrews = () => SCREW_ROWS.map((r) => ({ part: r.part, quantity: '' }));

// Voltaje aplicado (110 se agrego a peticion del checklist).
export const VOLTAGES = ['110', '230', '380', '460'];

export const emptyEquipmentType = () => ({ subtypes: [], aireador_sizes: [], turbina_kw: '', turbina_hp: '' });

const LEGACY_SUBTYPE = {
  'motor:trifasico': 'motor_trifasico', 'motor:monofasico': 'motor_monofasico',
  'motor:ventilador': 'motor_ventilador', 'motor:reductor': 'motor_reductor',
  'bomba:sumergible': 'bomba_sumergible', 'bomba:centrifuga': 'bomba_centrifuga',
};

// Acepta el formato nuevo o el viejo ({ category, subtypes, aireador_size, turbina_kw }).
export function normalizeEquipmentType(et) {
  const base = emptyEquipmentType();
  if (!et || typeof et !== 'object') return base;
  if (!('category' in et)) {
    return {
      subtypes: Array.isArray(et.subtypes) ? et.subtypes : [],
      aireador_sizes: Array.isArray(et.aireador_sizes) ? et.aireador_sizes : [],
      turbina_kw: et.turbina_kw || '',
      turbina_hp: et.turbina_hp || '',
    };
  }
  const subtypes = [];
  if (et.category === 'blower') subtypes.push('blower');
  if (et.category === 'generador') subtypes.push('generador');
  for (const s of et.subtypes || []) {
    const mapped = LEGACY_SUBTYPE[`${et.category}:${s}`];
    if (mapped) subtypes.push(mapped);
  }
  return {
    ...base,
    subtypes,
    aireador_sizes: et.category === 'aireador' && et.aireador_size ? [et.aireador_size] : [],
    turbina_kw: et.category === 'turbina' ? (et.turbina_kw || '') : '',
  };
}

const triple = (v) => {
  if (v && typeof v === 'object') return { l1: v.l1 || '', l2: v.l2 || '', l3: v.l3 || '' };
  return { l1: v || '', l2: '', l3: '' }; // formato viejo: un solo valor
};

export const emptyMeasurement = () => ({
  insulation: { l1: '', l2: '', l3: '' }, ohms: { l1: '', l2: '', l3: '' }, amperage: { l1: '', l2: '', l3: '' },
  applied_voltage: '', connection: { l1: '', l2: '', l3: '' }, temperature: { l1: '', l2: '', l3: '' }, ground: '',
  pulley_distance: '', coupling_distance: '', turbine_distance: '',
});
export const emptyMeasurementIntake = () => ({ ...emptyMeasurement(), balance_rotor: '', balance_turbine: '' });
export const emptyMeasurementDelivery = () => ({ ...emptyMeasurement(), wire_type: '' });

// Conexion y temperatura pasaron de una caja a tres (L1/L2/L3, como en el papel).
export function normalizeMeasurement(m, variant) {
  const base = variant === 'intake' ? emptyMeasurementIntake() : emptyMeasurementDelivery();
  if (!m || typeof m !== 'object') return base;
  return { ...base, ...m, connection: triple(m.connection), temperature: triple(m.temperature) };
}

// El talonario no tiene "Nombre del equipo" ni "Tipo de trabajo general", pero el resto
// del sistema (listas, PDF, cotizaciones) los sigue usando: se derivan de lo que se
// marco en el papel si nadie los trajo ya (de una maquina o de una cotizacion).
const WORK_TYPE_NAME = { rebobinado:'Rebobinado', mantenimiento:'Mantenimiento', cambio_conexion:'Cambio de conexion', calculo_voltaje:'Calculo de voltaje' };
// `catalog`: los tipos de equipo del catalogo ([{ code, name }]); sirve para nombrar los tipos
// creados desde Configuracion, que no estan en EQUIPMENT_CHECKS.
export function deriveEquipmentName(form, catalog = []) {
  if (form.equipment_name) return form.equipment_name;
  const et = normalizeEquipmentType(form.equipment_type);
  const names = [
    ...et.subtypes.map(v => catalog.find(c => c.code === v)?.name || EQUIPMENT_CHECKS.find(c => c.value === v)?.label).filter(Boolean),
    ...(et.aireador_sizes.length ? ['Aireador ' + et.aireador_sizes.map(v => AIREADOR_SIZES.find(a => a.value === v)?.label || v).join(', ')] : []),
    ...(et.turbina_kw || et.turbina_hp ? ['Turbina'] : []),
  ];
  return names.join(' / ');
}
export function deriveWorkType(form) {
  if (form.work_type) return form.work_type;
  const first = (form.work_types || []).find(v => WORK_TYPE_NAME[v]);
  if (first) return WORK_TYPE_NAME[first];
  return (form.work_types || []).length ? 'Otros' : '';
}
