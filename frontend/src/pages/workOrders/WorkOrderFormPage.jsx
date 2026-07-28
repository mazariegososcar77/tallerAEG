// PANTALLA: Alta / edición de una Orden de Trabajo. Aquí se registra el equipo
// que el cliente trajo al taller (datos técnicos), quién lo recibió, qué trabajo
// se le va a hacer, qué piezas trae el equipo, los técnicos que lo desarman y lo
// arman, y el estado (recibido → en_proceso → listo → entregado, o cancelado).
// Se puede prellenar automáticamente trayendo los datos desde una cotización ya
// aprobada (llega por el link "Crear Orden" de Cotizaciones); si esa cotización
// tenía varios equipos, se puede elegir cuál de ellos usar.
//
// El formulario replica el talonario físico real del taller (ver
// 029_work_orders_paper_form.sql): son demasiados campos para una sola pantalla
// larga, así que se organiza en TABS (ver TABS más abajo). Los grupos de
// checkboxes y las tablas de filas fijas del papel (tipo de trabajo, tipo de
// equipo, física/motor, tornillos, medición) se guardan como JSON, igual que
// "Partes del Equipo" ya guardaba su checklist -- solo que ahora hay varios.
//
// IMPORTANTE (decisión del negocio, a propósito): esta pantalla NUNCA muestra
// precios ni el total para el flujo "Pre" (el de siempre: se cotiza antes de
// abrir la orden, el precio ya vive en esa cotización). La orden de trabajo la
// usan los técnicos del taller, y ellos no necesitan ver cuánto cuesta nada —
// el precio es cosa de Cotizaciones y Facturación (administración). El campo
// "total" se guarda internamente (heredado de la cotización de origen) pero no
// hay ningún campo en pantalla para verlo ni editarlo. Los 3 precios nuevos que
// pidió Abdías (Torno/Repuestos/Mano de obra) siguen la misma regla: nunca se
// imprimen en el PDF (ver generarOrdenTrabajoPDF en el backend).
//
// EXCEPCIÓN a propósito, flujo "Post" (prop flowType="post"): aquí el equipo
// se desarma sin cotización previa, así que la orden es el único lugar donde
// existe un precio todavía cuando se abre. Por eso, solo para Post, se muestra
// una sección con 3 campos de precio (torno, repuestos, mano de obra) — la
// cotización real se arma después, cuando ya se sabe qué se encontró.
import { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { workOrdersApi } from '../../api/workOrdersApi.js';
import { quotesApi } from '../../api/quotesApi.js';
import { clientsApi } from '../../api/clientsApi.js';
import { clientTypesApi } from '../../api/clientTypesApi.js';
import { loyaltyTiersApi } from '../../api/loyaltyTiersApi.js';
import { articlesApi } from '../../api/articlesApi.js';
import { workReportsApi } from '../../api/workReportsApi.js';
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx';
import { getToken } from '../../lib/authStorage.js';
import { withUppercase } from '../../lib/text.js';
import { useAuth } from '../../hooks/useAuth.js';
import Combobox from '../../components/ui/Combobox.jsx';
import MachinePicker from '../../components/machines/MachinePicker.jsx';
import ClientPicker from '../../components/clients/ClientPicker.jsx';
import ClientFormModal from '../clients/ClientFormModal.jsx';

const WORK_TYPES = ['Rebobinado','Mantenimiento','Reparacion','Cambio de conexion','Calculo de voltaje','Otros'];
const STATUS_OPTIONS = [
  { value:'recibido',   label:'Recibido' },
  { value:'en_proceso', label:'En Proceso' },
  { value:'listo',      label:'Listo' },
  { value:'entregado',  label:'Entregado' },
  { value:'cancelado',  label:'Cancelado' },
];
const STATUS_COLORS = { recibido:'#1D9E75', en_proceso:'#CA8A04', listo:'#3b82f6', entregado:'#6366f1', cancelado:'#ef4444' };
const DEFAULT_ITEMS = ['Polea','Caja de conexion','Tapa de conexion','Bornera','Argolla','Ventilador','Lazo','Tolva','Placa de datos','Impulsor','Difusor','Housing de impulsor','Caja reductora','Cadena','Tapa capacitor','Base quebrada de motor','Tapas quebradas','Capacitores','Cuña','Retenedor'];
const LABOR_ARTICLE_TYPE_ID = 4; // catalogo "Mano de Obra" (ver 023_labor_catalog_seed.sql), el mismo que usa ArticleQuickModal en Cotizaciones

// ── Catálogos de los checkboxes/tablas del talonario (029_work_orders_paper_form.sql) ──
const WORK_TYPE_CHECKBOXES = [
  { value:'mantenimiento', label:'Mantenimiento' },
  { value:'rebobinado', label:'Rebobinado' },
  { value:'cambio_conexion', label:'Cambio de conexión' },
  { value:'calculo_voltaje', label:'Cálculo de voltaje' },
  { value:'extraccion_humedad', label:'Extracción de humedad' },
  { value:'extraccion_lodo_8m3', label:'Extracción de lodo (8mts³)' },
  { value:'extraccion_lodo_12m3', label:'Extracción de lodo (12mts³)' },
];
const EQUIPMENT_CATEGORIES = [
  { value:'motor', label:'Motor', subtypes:[
    { value:'trifasico', label:'Trifásico' }, { value:'monofasico', label:'Monofásico' },
    { value:'reductor', label:'Reductor' }, { value:'ventilador', label:'Ventilador' }, { value:'otros', label:'Otros' },
  ] },
  { value:'bomba', label:'Bomba', subtypes:[
    { value:'sumergible', label:'Sumergible' }, { value:'centrifuga', label:'Centrífuga' },
  ] },
  { value:'blower', label:'Blower', subtypes:[] },
  { value:'generador', label:'Generador', subtypes:[] },
  { value:'aireador', label:'Aireadores', subtypes:[] },
  { value:'turbina', label:'Turbina', subtypes:[] },
];
const AIREADOR_SIZES = ['1.5Kw','2Hp','2.2Kw','3Hp','3.7Kw','5Hp'];
const PUMP_SEAL_TYPES = [{ value:'viton', label:'Vitón' }, { value:'nitrilo', label:'Nitrilo' }, { value:'conico', label:'Cónico' }];
const PHYSICAL_PARTS_CHECKBOXES = [
  { value:'variador', label:'Variador' }, { value:'estator', label:'Estator' }, { value:'rotor', label:'Rotor' }, { value:'otros', label:'Otros' },
];
// Mismos nombres, mismo orden, que SCREW_ROWS en el backend (pdfGenerator.js) --
// la columna "part" es la que enlaza cada fila del formulario con la del PDF.
const SCREW_ROWS = [
  'Motor', 'Tolva', 'Caja de conexión', 'Tapa de conexión', 'Bornera', 'Bomba',
  'Retén cojinete delantero', 'Retén cojinete trasero', 'Impulsor', 'Turbina',
  'Castigadores de polea', 'Roldanas tornillo impulsor', 'Tuercas', 'Washas',
];
const SI_NO_OPTIONS = [{ value:'si', label:'Sí' }, { value:'no', label:'No' }];
const APPLIED_VOLTAGE_OPTIONS = [{ value:'230', label:'230V' }, { value:'380', label:'380V' }, { value:'460', label:'460V' }];
const WIRE_TYPE_OPTIONS = [{ value:'ultrashield', label:'UltraShield' }, { value:'normal', label:'Normal' }];

const TABS = [
  { id:'general', label:'Datos Generales' },
  { id:'fisica', label:'Física / Motor' },
  { id:'tornillos', label:'Tornillos' },
  { id:'componentes', label:'Componentes' },
  { id:'medicion_ingreso', label:'Medición Ingreso' },
  { id:'medicion_entrega', label:'Medición Entrega' },
  { id:'cierre', label:'Cierre y Precios' },
];

const emptyEquipmentType = () => ({ category:'', subtypes:[], aireador_size:'', turbina_kw:'' });
const emptyScrews = () => SCREW_ROWS.map(part => ({ part, quantity:'' }));
const emptyMeasurement = () => ({
  insulation:{ l1:'', l2:'', l3:'' }, ohms:{ l1:'', l2:'', l3:'' }, amperage:{ l1:'', l2:'', l3:'' },
  applied_voltage:'', connection:'', temperature:'', ground:'',
  pulley_distance:'', coupling_distance:'', turbine_distance:'',
});
const emptyMeasurementIntake = () => ({ ...emptyMeasurement(), balance_rotor:'', balance_turbine:'' });
const emptyMeasurementDelivery = () => ({ ...emptyMeasurement(), wire_type:'' });

const C = { bg:'var(--c-app)', card:'var(--c-surface)', dark:'var(--c-surface-2)', border:'var(--c-line)', input:'var(--c-surface-2)', text:'var(--c-text)', muted:'var(--c-muted)', orange:'#CA8A04' };
const inp = { width:'100%', background:C.input, border:'1px solid '+C.border, color:C.text, padding:'8px 10px', borderRadius:6, fontSize:12, boxSizing:'border-box', outline:'none' };
const lbl = { display:'block', fontSize:10, fontWeight:800, color:C.muted, textTransform:'uppercase', letterSpacing:'.6px', marginBottom:5 };
const sec = { background:C.card, border:'1px solid '+C.border, borderRadius:10, marginBottom:12, overflow:'hidden' };
const secHdr = { background:C.dark, borderBottom:'1px solid '+C.border, padding:'9px 16px', display:'flex', alignItems:'center', gap:8 };
const secTtl = { fontSize:11, fontWeight:800, color:C.orange, letterSpacing:'1px', textTransform:'uppercase' };
const secBody = { padding:'14px 16px' };

const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return isMobile;
};

const SaveIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/>
    <polyline points="17 21 17 13 7 13 7 21"/>
    <polyline points="7 3 7 8 15 8"/>
  </svg>
);

const DownloadIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
    <polyline points="7 10 12 15 17 10"/>
    <line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
);

const SectionHeader = ({ title }) => (
  <div style={secHdr}>
    <span style={{ width:6, height:6, background:C.orange, borderRadius:'50%', display:'inline-block' }}></span>
    <span style={secTtl}>{title}</span>
  </div>
);

// Grupo de checkboxes en "chips" (mismo estilo visual que ya usaba "Partes del
// Equipo"): cada opción es un cuadro clicable completo, no solo la casilla.
const CheckboxChips = ({ options, values, onToggle, cols = 3 }) => (
  <div style={{ display:'grid', gridTemplateColumns:`repeat(${cols},1fr)`, gap:6 }}>
    {options.map(opt => {
      const checked = (values || []).includes(opt.value);
      return (
        <div key={opt.value} onClick={() => onToggle(opt.value)}
          style={{ background:checked ? C.orange+'18' : C.dark, border:'1px solid '+(checked ? C.orange+'55' : C.border), borderRadius:6, padding:'8px 10px', display:'flex', alignItems:'center', gap:6, cursor:'pointer' }}>
          <div style={{ width:13, height:13, borderRadius:3, border:'1.5px solid '+(checked ? C.orange : '#2a5540'), background:checked ? C.orange : 'transparent', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
            {checked && <span style={{ color:'#fff', fontSize:8, fontWeight:900, lineHeight:1 }}>✓</span>}
          </div>
          <span style={{ fontSize:11, color:checked ? C.text : 'var(--c-muted)', lineHeight:1.3 }}>{opt.label}</span>
        </div>
      );
    })}
  </div>
);

// Tabla de tornillos: 14 filas fijas (10 "por parte" + 4 "sueltos"), solo cantidad.
const ScrewsTable = ({ value, onChange, isMobile }) => {
  const rows = (value && value.length) ? value : emptyScrews();
  const setQty = (part, qty) => onChange(rows.map(r => r.part === part ? { ...r, quantity: qty } : r));
  return (
    <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap:'8px 20px' }}>
      {rows.map(row => (
        <div key={row.part} style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ flex:1, fontSize:12, color:C.text }}>{row.part}</span>
          <input value={row.quantity || ''} onChange={e => setQty(row.part, e.target.value)} style={{ ...inp, width:80 }} placeholder="Cant." />
        </div>
      ))}
    </div>
  );
};

// Bloque de mediciones del talonario: se usa dos veces (como ingresa / como se
// entrega el equipo) con exactamente el mismo layout -- solo cambian los 1-2
// campos finales (balanceo dinámico al ingresar, tipo de alambre al entregar).
const MeasurementBlock = ({ value, onChange, variant, isMobile }) => {
  const v = value || (variant === 'intake' ? emptyMeasurementIntake() : emptyMeasurementDelivery());
  const setField = (k, val) => onChange({ ...v, [k]: val });
  const setRow = (rowKey, col, val) => onChange({ ...v, [rowKey]: { ...v[rowKey], [col]: val } });
  const rows = [
    ['insulation', 'Medición de Aislamiento'],
    ['ohms', 'Medición de OHMS'],
    ['amperage', 'Medición de Amperaje'],
  ];
  const grid2 = { display:'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap:10, marginBottom:10 };
  return (
    <div>
      {rows.map(([key, label]) => (
        <div key={key} style={{ marginBottom:10 }}>
          <label style={lbl}>{label}</label>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
            {['l1','l2','l3'].map(col => (
              <input key={col} placeholder={col.toUpperCase()} value={v[key]?.[col] || ''} onChange={e => setRow(key, col, e.target.value)} style={inp} />
            ))}
          </div>
        </div>
      ))}
      <div style={grid2}>
        <div>
          <label style={lbl}>Voltaje Aplicado</label>
          <Combobox value={v.applied_voltage || ''} onChange={val => setField('applied_voltage', val)} options={APPLIED_VOLTAGE_OPTIONS} placeholder="Seleccionar..." />
        </div>
        <div>
          <label style={lbl}>Medición de Tierra</label>
          <Combobox value={v.ground || ''} onChange={val => setField('ground', val)} options={SI_NO_OPTIONS} placeholder="Seleccionar..." />
        </div>
      </div>
      <div style={grid2}>
        <div><label style={lbl}>Conexión</label><input value={v.connection || ''} onChange={withUppercase(e => setField('connection', e.target.value))} style={inp} /></div>
        <div><label style={lbl}>Temperatura</label><input value={v.temperature || ''} onChange={withUppercase(e => setField('temperature', e.target.value))} style={inp} /></div>
      </div>
      <div style={grid2}>
        <div><label style={lbl}>Distancia Polea</label><input value={v.pulley_distance || ''} onChange={withUppercase(e => setField('pulley_distance', e.target.value))} style={inp} /></div>
        <div><label style={lbl}>Distancia Acople</label><input value={v.coupling_distance || ''} onChange={withUppercase(e => setField('coupling_distance', e.target.value))} style={inp} /></div>
      </div>
      <div style={grid2}>
        <div><label style={lbl}>Distancia Turbina</label><input value={v.turbine_distance || ''} onChange={withUppercase(e => setField('turbine_distance', e.target.value))} style={inp} /></div>
        {variant === 'intake' ? (
          <div>
            <label style={lbl}>Balanceo Dinámico Rotor</label>
            <Combobox value={v.balance_rotor || ''} onChange={val => setField('balance_rotor', val)} options={SI_NO_OPTIONS} placeholder="Seleccionar..." />
          </div>
        ) : (
          <div>
            <label style={lbl}>Alambre</label>
            <Combobox value={v.wire_type || ''} onChange={val => setField('wire_type', val)} options={WIRE_TYPE_OPTIONS} placeholder="Seleccionar..." />
          </div>
        )}
      </div>
      {variant === 'intake' && (
        <div>
          <label style={lbl}>Balanceo Dinámico Turbina</label>
          <Combobox value={v.balance_turbine || ''} onChange={val => setField('balance_turbine', val)} options={SI_NO_OPTIONS} placeholder="Seleccionar..." />
        </div>
      )}
    </div>
  );
};

export default function WorkOrderFormPage({ flowType = 'pre' }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fromQuoteId = searchParams.get('fromQuote');
  const isEdit = Boolean(id);
  const isMobile = useIsMobile();
  const { hasPermission } = useAuth();
  const [clients, setClients] = useState([]);
  const [clientTypes, setClientTypes] = useState([]);
  const [loyaltyTiers, setLoyaltyTiers] = useState([]);
  const [laborArticles, setLaborArticles] = useState([]);
  const [showClientModal, setShowClientModal] = useState(false);
  const [showReportPrompt, setShowReportPrompt] = useState(false);
  const [createdOrderId, setCreatedOrderId] = useState(null);
  const [openingReport, setOpeningReport] = useState(false);
  const [saving, setSaving] = useState(false);
  const [orderNumber, setOrderNumber] = useState('—');
  const [sourceQuote, setSourceQuote] = useState(null);
  const [equipIndex, setEquipIndex] = useState(0);
  const [activeTab, setActiveTab] = useState('general');
  const [form, setForm] = useState({
    client_id:'', machine_id:null, received_at:new Date().toISOString().slice(0,10),
    delivery_at:'', next_service_at:'', reported_problem:'',
    authorized_by:'', project:'', status:'recibido',
    equipment_name:'', equipment_type: emptyEquipmentType(), brand:'', model:'', serial:'',
    kw:'', voltage:'', amperage:'', rpm:'', hp:'', frame:'',
    pump_impeller:'', pump_bm:'', pump_seal_size:'', pump_seal_type:'',
    physical_parts:[], retainers_count:'', shaft_rectify_mm:'', bearings_count:'', bearings_mm:'',
    seal_liner_mm:'', front_cover_mm:'', rear_cover_mm:'', fan_hole_mm:'', lathe_kw:'', lathe_hp:'',
    screws: emptyScrews(),
    measurement_intake: emptyMeasurementIntake(), measurement_delivery: emptyMeasurementDelivery(),
    work_type:'', work_types:[], observations:'', internal_notes:'',
    quotation_number:'', dte_number:'', oc_number:'',
    tech_disarm:'', tech_assemble:'',
    supervisor_aeg_receive:'', supervisor_aeg_deliver:'', supervisor_client_deliver:'', supervisor_client_receive:'',
    shipping:'', whatsapp_number:'',
    total:'', quote_id:null,
    flow_type: flowType, torno_price:'', parts_price:'', labor_article_id:null, labor_price:'',
  });
  const [items, setItems] = useState(DEFAULT_ITEMS.map(n => ({ name:n, quantity:1, has_item:false })));
  // La ruta ya manda al flujo correcto (/ordenes vs /post/ordenes), pero en
  // modo edicion se respeta el flow_type real de la orden cargada, no el de
  // la ruta con la que se llego -- por si alguna vez difieren.
  const ordersBasePath = (form.flow_type === 'post') ? '/post/ordenes' : '/ordenes';

  // Prellena el formulario con los datos de un equipo de la cotizacion de origen.
  const applyQuoteEquip = (quote, ei) => {
    const eq = quote.equipment_data?.[ei] || {};
    const eqItems = (quote.items || []).filter(i => i.equipment_index === ei);
    const eqTotal = eqItems.reduce((s, i) => s + Number(i.subtotal || 0), 0);
    setForm(f => ({
      ...f,
      client_id: quote.client_id,
      machine_id: eq.machine_id || null,
      equipment_name: eq.name || '', brand: eq.brand || '', model: eq.model || '', serial: eq.serial || '',
      work_type: quote.work_type || '',
      quotation_number: quote.number || '',
      total: eqTotal || quote.total || '',
      quote_id: quote.id,
    }));
  };

  useEffect(() => {
    clientsApi.list().then(setClients);
    clientTypesApi.list().then(setClientTypes);
    loyaltyTiersApi.list().then(setLoyaltyTiers);
    articlesApi.listByType(LABOR_ARTICLE_TYPE_ID).then(setLaborArticles);
    if (isEdit) {
      workOrdersApi.get(id).then(order => {
        const { items:oi, ...rest } = order;
        setOrderNumber(rest.number || '—');
        setForm(f => ({ ...f, ...rest,
          received_at: rest.received_at?.slice(0,10) || '',
          delivery_at: rest.delivery_at?.slice(0,10) || '',
          next_service_at: rest.next_service_at?.slice(0,10) || '',
          equipment_type: rest.equipment_type || emptyEquipmentType(),
          physical_parts: rest.physical_parts || [],
          screws: (rest.screws && rest.screws.length) ? rest.screws : emptyScrews(),
          measurement_intake: rest.measurement_intake || emptyMeasurementIntake(),
          measurement_delivery: rest.measurement_delivery || emptyMeasurementDelivery(),
          work_types: rest.work_types || [],
        }));
        if (oi?.length) setItems(oi);
      });
    } else if (fromQuoteId) {
      quotesApi.get(fromQuoteId).then(quote => {
        setSourceQuote(quote);
        applyQuoteEquip(quote, 0);
      });
    }
  }, [id, fromQuoteId]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  // Marca o desmarca una pieza de la lista de "Partes del Equipo" (que piezas trae el equipo al llegar).
  const toggleItem = (i) => setItems(p => p.map((it, idx) => idx === i ? { ...it, has_item: !it.has_item } : it));
  // Agrega/quita un valor de un campo que guarda un arreglo simple de strings (work_types, physical_parts).
  const toggleArrayValue = (key, value) => setForm(f => {
    const arr = f[key] || [];
    return { ...f, [key]: arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value] };
  });
  const setEquipCategory = (category) => setForm(f => ({ ...f, equipment_type: { ...emptyEquipmentType(), category } }));
  const toggleEquipSubtype = (value) => setForm(f => {
    const subtypes = f.equipment_type?.subtypes || [];
    const next = subtypes.includes(value) ? subtypes.filter(v => v !== value) : [...subtypes, value];
    return { ...f, equipment_type: { ...f.equipment_type, subtypes: next } };
  });
  const setEquipField = (k, val) => setForm(f => ({ ...f, equipment_type: { ...f.equipment_type, [k]: val } }));
  // Tras crear un cliente "rapido": recarga la lista y lo deja seleccionado.
  const handleClientSaved = (created) => {
    clientsApi.list().then(setClients);
    if (created?.id) set('client_id', created.id);
    setShowClientModal(false);
  };

  // Guarda la orden de trabajo (nueva o editada). Exige que tenga un cliente seleccionado.
  // Al CREAR una orden Post, en vez de ir directo a la lista, se le pregunta al
  // usuario si quiere abrir de una vez el Reporte de Trabajo (asi arranca el
  // flujo Orden -> Reporte -> Cotizacion -> Factura). Para Pre, o al editar,
  // sigue navegando directo como siempre.
  const handleSubmit = async () => {
    if (!form.client_id) return alert('Selecciona un cliente');
    setSaving(true);
    try {
      if (isEdit) {
        await workOrdersApi.update(id, { ...form, items });
        navigate(ordersBasePath);
      } else {
        const created = await workOrdersApi.create({ ...form, items });
        if (form.flow_type === 'post') {
          setCreatedOrderId(created.id);
          setShowReportPrompt(true);
        } else {
          navigate(ordersBasePath);
        }
      }
    } catch(e) { alert(e.response?.data?.message || e.response?.data?.error || e.message || 'Error al guardar'); }
    finally { setSaving(false); }
  };

  // El usuario acepto abrir el reporte: lo crea (idempotente) y navega ahi.
  const handleOpenReport = async () => {
    setOpeningReport(true);
    try {
      const report = await workReportsApi.createForOrder(createdOrderId);
      navigate('/reportes/' + report.id + '/editar');
    } catch (e) {
      alert(e.message || 'No se pudo abrir el reporte');
      navigate(ordersBasePath);
    } finally {
      setOpeningReport(false);
    }
  };

  // Descarga el PDF de la orden ya guardada (por eso pide guardar primero si es nueva).
  const handleDownloadPDF = async () => {
    if (!id) return alert('Guarda la orden primero');
    try {
      const token = getToken();
      const res = await fetch(`/api/work-orders/${id}/pdf`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `orden-${orderNumber}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch(e) { alert('Error al generar PDF'); }
  };

  const statusColor = STATUS_COLORS[form.status] || '#1D9E75';
  const statusLabel = STATUS_OPTIONS.find(s => s.value === form.status)?.label || 'Recibido';
  const selectedCategory = EQUIPMENT_CATEGORIES.find(c => c.value === form.equipment_type?.category);
  const gridCols = isMobile ? '1fr 1fr' : '1fr 1fr 1fr 1fr';

  return (
    <div style={{ background:C.bg, minHeight:'100vh', margin:'-24px', padding:0 }}>

      {/* Topbar */}
      <div style={{ background:C.card, borderBottom:'1px solid '+C.border, padding:'10px 16px', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:8 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
          <button onClick={() => navigate(ordersBasePath)} style={{ background:C.dark, border:'1px solid '+C.border, color:'#8fb3a0', padding:'6px 12px', borderRadius:6, cursor:'pointer', fontSize:12 }}>
            ← Volver
          </button>
          <span style={{ fontSize:isMobile?13:15, fontWeight:700, color:C.text }}>{isEdit ? 'Editar Orden' : 'Nueva Orden de Trabajo'}</span>
          {isEdit && <span style={{ background:C.orange+'22', border:'1px solid '+C.orange+'66', color:C.orange, padding:'3px 10px', borderRadius:4, fontSize:11, fontWeight:700 }}>No. {orderNumber}</span>}
          <span style={{ background:statusColor+'22', border:'1px solid '+statusColor+'44', color:statusColor, padding:'3px 10px', borderRadius:4, fontSize:11, fontWeight:700, display:'flex', alignItems:'center', gap:5 }}>
            <span style={{ width:6, height:6, background:statusColor, borderRadius:'50%', display:'inline-block' }}></span>
            {statusLabel}
          </span>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          {isEdit && (
            <button onClick={handleDownloadPDF} style={{ background:'#10b981', border:'none', color:'#fff', padding:'8px 16px', borderRadius:6, fontWeight:700, fontSize:13, cursor:'pointer', display:'flex', alignItems:'center', gap:7 }}>
              <DownloadIcon /> PDF
            </button>
          )}
          <button onClick={handleSubmit} disabled={saving} style={{ background:C.orange, border:'none', color:'#fff', padding:'8px 18px', borderRadius:6, fontWeight:700, fontSize:13, cursor:'pointer', display:'flex', alignItems:'center', gap:7, opacity:saving?0.7:1 }}>
            <SaveIcon /> {saving ? 'Guardando...' : 'Guardar Orden'}
          </button>
        </div>
      </div>

      {/* Botón guardar sticky en móvil */}
      {isMobile && (
        <div style={{ position:'sticky', top:0, zIndex:100, padding:'8px 16px', background:C.bg, borderBottom:'1px solid '+C.border }}>
          <div style={{ display:'flex', gap:8 }}>
            {isEdit && (
              <button onClick={handleDownloadPDF} style={{ background:'#10b981', border:'none', color:'#fff', padding:'10px 14px', borderRadius:6, fontWeight:700, fontSize:13, cursor:'pointer', display:'flex', alignItems:'center', gap:7 }}>
                <DownloadIcon /> PDF
              </button>
            )}
            <button onClick={handleSubmit} disabled={saving} style={{ background:C.orange, border:'none', color:'#fff', padding:'10px', borderRadius:6, fontWeight:700, fontSize:13, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:7, flex:1, opacity:saving?0.7:1 }}>
              <SaveIcon /> {saving ? 'Guardando...' : 'Guardar Orden'}
            </button>
          </div>
        </div>
      )}

      {/* Tabs: son demasiados campos (todo el talonario) para una sola pantalla larga */}
      <div style={{ display:'flex', gap:6, overflowX:'auto', padding: isMobile ? '10px 12px' : '10px 20px', background:C.card, borderBottom:'1px solid '+C.border }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            style={{
              whiteSpace:'nowrap', padding:'8px 14px', borderRadius:8, border:'1px solid '+(activeTab===t.id ? C.orange : C.border),
              background: activeTab===t.id ? C.orange+'18' : C.dark, color: activeTab===t.id ? C.orange : C.muted,
              fontSize:12, fontWeight:700, cursor:'pointer',
            }}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ padding: isMobile ? '12px' : '16px 20px', maxWidth:960, margin:'0 auto' }}>

        {sourceQuote && (
          <div style={{ background:C.orange+'14', border:'1px solid '+C.orange+'44', borderRadius:8, padding:'10px 14px', marginBottom:12, display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
            <span style={{ fontSize:12, color:C.text }}>
              Datos prellenados desde la cotización <strong>No. {sourceQuote.number}</strong>.
            </span>
            {sourceQuote.equipment_data?.length > 1 && (
              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                <span style={{ fontSize:11, color:C.muted }}>Equipo:</span>
                <Combobox
                  value={equipIndex}
                  onChange={v => { setEquipIndex(Number(v)); applyQuoteEquip(sourceQuote, Number(v)); }}
                  options={sourceQuote.equipment_data.map((eq, i) => ({ value:i, label: eq.name || ('Equipo ' + (i+1)) }))}
                  style={{ minWidth:160 }}
                />
              </div>
            )}
          </div>
        )}

        {/* ═══ TAB: DATOS GENERALES ═══ */}
        {activeTab === 'general' && (
          <>
            {/* Info general: cliente, fechas de recibido/entrega/proximo servicio, falla, estado */}
            <div style={sec}>
              <SectionHeader title="Informacion General" />
              <div style={secBody}>
                <div style={{ display:'grid', gridTemplateColumns: gridCols, gap:10 }}>
                  <div style={{ gridColumn:'span 2' }}>
                    <label style={lbl}>Cliente *</label>
                    <ClientPicker
                      clients={clients}
                      value={form.client_id}
                      onChange={v => set('client_id', v)}
                      canCreate={hasPermission('clients.quick-create')}
                      onCreateNew={() => setShowClientModal(true)}
                    />
                  </div>
                  <div>
                    <label style={lbl}>Fecha Recibido *</label>
                    <input type='date' value={form.received_at||''} onChange={e => set('received_at', e.target.value)} style={inp}
                      onClick={e => e.target.showPicker && e.target.showPicker()} />
                  </div>
                  <div>
                    <label style={lbl}>Fecha Entrega</label>
                    <input type='date' value={form.delivery_at||''} onChange={e => set('delivery_at', e.target.value)} style={inp}
                      onClick={e => e.target.showPicker && e.target.showPicker()} />
                  </div>
                </div>
                <div style={{ display:'grid', gridTemplateColumns: gridCols, gap:10, marginTop:10 }}>
                  <div><label style={lbl}>Autorizado por</label><input value={form.authorized_by||''} onChange={withUppercase(e => set('authorized_by', e.target.value))} style={inp} /></div>
                  <div><label style={lbl}>Proyecto</label><input value={form.project||''} onChange={withUppercase(e => set('project', e.target.value))} style={inp} /></div>
                  <div><label style={lbl}>No. Cotizacion</label><input value={form.quotation_number||''} onChange={withUppercase(e => set('quotation_number', e.target.value))} style={inp} /></div>
                  <div>
                    <label style={lbl}>Estado</label>
                    <Combobox value={form.status} onChange={v => set('status', v)} options={STATUS_OPTIONS} />
                  </div>
                </div>
                <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 3fr', gap:10, marginTop:10 }}>
                  <div>
                    <label style={lbl}>Próximo Servicio</label>
                    <input type='date' value={form.next_service_at||''} onChange={e => set('next_service_at', e.target.value)} style={inp}
                      onClick={e => e.target.showPicker && e.target.showPicker()} />
                  </div>
                  <div>
                    <label style={lbl}>Falla o Problema</label>
                    <textarea value={form.reported_problem||''} onChange={withUppercase(e => set('reported_problem', e.target.value))} rows={2} style={{ ...inp, resize:'vertical' }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Trabajo a realizar: checkboxes del papel + el tipo de trabajo (single-select, usado por Cotizaciones) */}
            <div style={sec}>
              <SectionHeader title="Trabajo a Realizar" />
              <div style={secBody}>
                <CheckboxChips options={WORK_TYPE_CHECKBOXES} values={form.work_types} onToggle={v => toggleArrayValue('work_types', v)} cols={isMobile ? 1 : 3} />
                <div style={{ marginTop:12, maxWidth: isMobile ? '100%' : 280 }}>
                  <label style={lbl}>Tipo de Trabajo (general)</label>
                  <Combobox value={form.work_type||''} onChange={v => set('work_type', v)}
                    options={WORK_TYPES.map(t => ({ value:t, label:t }))} placeholder="Seleccionar..." />
                </div>
              </div>
            </div>

            {/* Tipo de equipo: categoria + subtipos marcados con checkbox */}
            <div style={sec}>
              <SectionHeader title="Tipo de Equipo" />
              <div style={secBody}>
                <div style={{ maxWidth: isMobile ? '100%' : 280, marginBottom:12 }}>
                  <label style={lbl}>Categoría</label>
                  <Combobox value={form.equipment_type?.category||''} onChange={setEquipCategory}
                    options={EQUIPMENT_CATEGORIES.map(c => ({ value:c.value, label:c.label }))} placeholder="Seleccionar..." />
                </div>
                {selectedCategory?.subtypes?.length > 0 && (
                  <CheckboxChips options={selectedCategory.subtypes} values={form.equipment_type?.subtypes} onToggle={toggleEquipSubtype} cols={isMobile ? 2 : 3} />
                )}
                {form.equipment_type?.category === 'aireador' && (
                  <div style={{ marginTop:12, maxWidth: isMobile ? '100%' : 280 }}>
                    <label style={lbl}>Tamaño del Aireador</label>
                    <Combobox value={form.equipment_type?.aireador_size||''} onChange={v => setEquipField('aireador_size', v)}
                      options={AIREADOR_SIZES.map(s => ({ value:s, label:s }))} placeholder="Seleccionar..." />
                  </div>
                )}
                {form.equipment_type?.category === 'turbina' && (
                  <div style={{ marginTop:12, maxWidth: isMobile ? '100%' : 280 }}>
                    <label style={lbl}>Turbina (Kw)</label>
                    <input value={form.equipment_type?.turbina_kw||''} onChange={withUppercase(e => setEquipField('turbina_kw', e.target.value))} style={inp} />
                  </div>
                )}
              </div>
            </div>

            {/* Datos tecnicos del equipo (motor) + datos especificos de bomba */}
            <div style={sec}>
              <SectionHeader title="Datos del Equipo" />
              <div style={secBody}>
                <div style={{ marginBottom:10 }}>
                  <label style={lbl}>Máquina del Cliente (opcional)</label>
                  <MachinePicker
                    clientId={form.client_id}
                    clients={clients}
                    value={form.machine_id}
                    onChange={v => set('machine_id', v)}
                    onMachineLoaded={m => setForm(f => ({ ...f, machine_id: m.id,
                      equipment_name: m.name || f.equipment_name, brand: m.brand || f.brand,
                      serial: m.serial || f.serial, kw: m.kw || f.kw, voltage: m.voltage || f.voltage,
                      amperage: m.amperage || f.amperage, rpm: m.rpm || f.rpm, hp: m.hp || f.hp }))}
                  />
                </div>
                <div style={{ display:'grid', gridTemplateColumns: gridCols, gap:10 }}>
                  <div style={{ gridColumn:'span 2' }}><label style={lbl}>Nombre del Equipo</label><input value={form.equipment_name||''} onChange={withUppercase(e => set('equipment_name', e.target.value))} style={inp} /></div>
                  <div><label style={lbl}>Marca</label><input value={form.brand||''} onChange={withUppercase(e => set('brand', e.target.value))} style={inp} /></div>
                  <div><label style={lbl}>Serie / Modelo</label><input value={form.serial||''} onChange={withUppercase(e => set('serial', e.target.value))} style={inp} /></div>
                </div>
                <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr 1fr 1fr' : 'repeat(6,1fr)', gap:10, marginTop:10 }}>
                  <div><label style={lbl}>KW</label><input type='number' value={form.kw||''} onChange={e => set('kw', e.target.value)} style={inp} /></div>
                  <div><label style={lbl}>Voltaje</label><input value={form.voltage||''} onChange={withUppercase(e => set('voltage', e.target.value))} style={inp} /></div>
                  <div><label style={lbl}>Amperaje</label><input value={form.amperage||''} onChange={withUppercase(e => set('amperage', e.target.value))} style={inp} /></div>
                  <div><label style={lbl}>RPM</label><input type='number' value={form.rpm||''} onChange={e => set('rpm', e.target.value)} style={inp} /></div>
                  <div><label style={lbl}>HP</label><input type='number' value={form.hp||''} onChange={e => set('hp', e.target.value)} style={inp} /></div>
                  <div><label style={lbl}>Frame</label><input value={form.frame||''} onChange={withUppercase(e => set('frame', e.target.value))} style={inp} /></div>
                </div>
                <div style={{ borderTop:'1px solid '+C.border, margin:'12px 0' }} />
                <div style={{ fontSize:10, fontWeight:800, color:C.muted, textTransform:'uppercase', letterSpacing:'.6px', marginBottom:8 }}>Datos de Bomba</div>
                <div style={{ display:'grid', gridTemplateColumns: gridCols, gap:10 }}>
                  <div><label style={lbl}>Impeller</label><input value={form.pump_impeller||''} onChange={withUppercase(e => set('pump_impeller', e.target.value))} style={inp} /></div>
                  <div><label style={lbl}>B.M.</label><input value={form.pump_bm||''} onChange={withUppercase(e => set('pump_bm', e.target.value))} style={inp} /></div>
                  <div><label style={lbl}>Medida de Sello</label><input value={form.pump_seal_size||''} onChange={withUppercase(e => set('pump_seal_size', e.target.value))} style={inp} /></div>
                  <div>
                    <label style={lbl}>Tipo de Sello</label>
                    <Combobox value={form.pump_seal_type||''} onChange={v => set('pump_seal_type', v)} options={PUMP_SEAL_TYPES} placeholder="Seleccionar..." />
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ═══ TAB: FISICA / MOTOR ═══ */}
        {activeTab === 'fisica' && (
          <div style={sec}>
            <SectionHeader title="Física / Motor" />
            <div style={secBody}>
              <CheckboxChips options={PHYSICAL_PARTS_CHECKBOXES} values={form.physical_parts} onToggle={v => toggleArrayValue('physical_parts', v)} cols={isMobile ? 2 : 4} />
              <div style={{ display:'grid', gridTemplateColumns: gridCols, gap:10, marginTop:14 }}>
                <div><label style={lbl}>Retenedores No.</label><input value={form.retainers_count||''} onChange={e => set('retainers_count', e.target.value)} style={inp} /></div>
                <div><label style={lbl}>Rectificar Eje (mm)</label><input value={form.shaft_rectify_mm||''} onChange={e => set('shaft_rectify_mm', e.target.value)} style={inp} /></div>
                <div><label style={lbl}>Cambio Cojinetes No.</label><input value={form.bearings_count||''} onChange={e => set('bearings_count', e.target.value)} style={inp} /></div>
                <div><label style={lbl}>Cojinetes (mm)</label><input value={form.bearings_mm||''} onChange={e => set('bearings_mm', e.target.value)} style={inp} /></div>
                <div><label style={lbl}>Camisa Sello (mm)</label><input value={form.seal_liner_mm||''} onChange={e => set('seal_liner_mm', e.target.value)} style={inp} /></div>
                <div><label style={lbl}>Tapa Delantera (mm)</label><input value={form.front_cover_mm||''} onChange={e => set('front_cover_mm', e.target.value)} style={inp} /></div>
                <div><label style={lbl}>Tapa Trasera (mm)</label><input value={form.rear_cover_mm||''} onChange={e => set('rear_cover_mm', e.target.value)} style={inp} /></div>
                <div><label style={lbl}>Perforación Ventilador (mm)</label><input value={form.fan_hole_mm||''} onChange={e => set('fan_hole_mm', e.target.value)} style={inp} /></div>
              </div>
              <div style={{ borderTop:'1px solid '+C.border, margin:'12px 0' }} />
              <div style={{ fontSize:10, fontWeight:800, color:C.muted, textTransform:'uppercase', letterSpacing:'.6px', marginBottom:8 }}>Torno</div>
              <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr 1fr 1fr 1fr', gap:10 }}>
                <div><label style={lbl}>Torno - KW</label><input value={form.lathe_kw||''} onChange={e => set('lathe_kw', e.target.value)} style={inp} /></div>
                <div><label style={lbl}>Torno - HP</label><input value={form.lathe_hp||''} onChange={e => set('lathe_hp', e.target.value)} style={inp} /></div>
              </div>
            </div>
          </div>
        )}

        {/* ═══ TAB: TORNILLOS ═══ */}
        {activeTab === 'tornillos' && (
          <div style={sec}>
            <SectionHeader title="Tornillos" />
            <div style={secBody}>
              <ScrewsTable value={form.screws} onChange={v => set('screws', v)} isMobile={isMobile} />
            </div>
          </div>
        )}

        {/* ═══ TAB: COMPONENTES ═══ */}
        {activeTab === 'componentes' && (
          <div style={sec}>
            <SectionHeader title="Partes del Equipo" />
            <div style={secBody}>
              <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4,1fr)', gap:6 }}>
                {items.map((item, i) => (
                  <div key={i} onClick={() => toggleItem(i)}
                    style={{ background:item.has_item ? C.orange+'18' : C.dark, border:'1px solid '+(item.has_item ? C.orange+'55' : C.border), borderRadius:6, padding:'8px 10px', display:'flex', alignItems:'center', gap:6, cursor:'pointer' }}>
                    <div style={{ width:13, height:13, borderRadius:3, border:'1.5px solid '+(item.has_item ? C.orange : '#2a5540'), background:item.has_item ? C.orange : 'transparent', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
                      {item.has_item && <span style={{ color:'#fff', fontSize:8, fontWeight:900, lineHeight:1 }}>✓</span>}
                    </div>
                    <span style={{ fontSize:11, color:item.has_item ? C.text : 'var(--c-muted)', lineHeight:1.3 }}>{item.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ═══ TAB: MEDICION INGRESO ═══ */}
        {activeTab === 'medicion_ingreso' && (
          <div style={sec}>
            <SectionHeader title="Medición — Como Ingresa Equipo" />
            <div style={secBody}>
              <MeasurementBlock value={form.measurement_intake} onChange={v => set('measurement_intake', v)} variant="intake" isMobile={isMobile} />
            </div>
          </div>
        )}

        {/* ═══ TAB: MEDICION ENTREGA ═══ */}
        {activeTab === 'medicion_entrega' && (
          <div style={sec}>
            <SectionHeader title="Medición — Como Se Entrega Equipo" />
            <div style={secBody}>
              <MeasurementBlock value={form.measurement_delivery} onChange={v => set('measurement_delivery', v)} variant="delivery" isMobile={isMobile} />
            </div>
          </div>
        )}

        {/* ═══ TAB: CIERRE Y PRECIOS ═══ */}
        {activeTab === 'cierre' && (
          <>
            <div style={sec}>
              <SectionHeader title="Observaciones" />
              <div style={secBody}>
                <textarea value={form.observations||''} onChange={withUppercase(e => set('observations', e.target.value))} rows={3} style={{ ...inp, resize:'vertical' }} />
              </div>
            </div>

            <div style={sec}>
              <SectionHeader title="Cierre" />
              <div style={secBody}>
                <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr 1fr', gap:10 }}>
                  <div><label style={lbl}>Técnico Desarma</label><input value={form.tech_disarm||''} onChange={withUppercase(e => set('tech_disarm', e.target.value))} style={inp} /></div>
                  <div><label style={lbl}>Técnico Arma</label><input value={form.tech_assemble||''} onChange={withUppercase(e => set('tech_assemble', e.target.value))} style={inp} /></div>
                  <div><label style={lbl}>Supervisor AEG Recibe</label><input value={form.supervisor_aeg_receive||''} onChange={withUppercase(e => set('supervisor_aeg_receive', e.target.value))} style={inp} /></div>
                  <div><label style={lbl}>Supervisor AEG Entrega</label><input value={form.supervisor_aeg_deliver||''} onChange={withUppercase(e => set('supervisor_aeg_deliver', e.target.value))} style={inp} /></div>
                  <div><label style={lbl}>Superv. Turno Cliente Entrega</label><input value={form.supervisor_client_deliver||''} onChange={withUppercase(e => set('supervisor_client_deliver', e.target.value))} style={inp} /></div>
                  <div><label style={lbl}>Superv. Turno Cliente Recibe</label><input value={form.supervisor_client_receive||''} onChange={withUppercase(e => set('supervisor_client_receive', e.target.value))} style={inp} /></div>
                  <div><label style={lbl}>Envío</label><input value={form.shipping||''} onChange={withUppercase(e => set('shipping', e.target.value))} style={inp} /></div>
                  <div><label style={lbl}>WhatsApp</label><input value={form.whatsapp_number||''} onChange={e => set('whatsapp_number', e.target.value)} style={inp} /></div>
                  <div>
                    <label style={lbl}>DTE No. {form.dte_number && <span style={{ color:C.muted, fontWeight:400, textTransform:'none' }}>(se llena solo al facturar)</span>}</label>
                    <input value={form.dte_number||''} onChange={withUppercase(e => set('dte_number', e.target.value))} style={inp} />
                  </div>
                  <div><label style={lbl}>O.C. No.</label><input value={form.oc_number||''} onChange={withUppercase(e => set('oc_number', e.target.value))} style={inp} /></div>
                </div>
              </div>
            </div>

            {/* Precios (SOLO flujo Post): aqui todavia no existe cotizacion, asi que la
                orden es donde se capturan los estimados de torno, repuestos y mano de
                obra -- para Pre esta seccion no aparece, y NUNCA se imprime en el PDF
                (ver comentario del encabezado del archivo). */}
            {form.flow_type === 'post' && (
              <div style={sec}>
                <SectionHeader title="Precios Estimados (Flujo Post)" />
                <div style={secBody}>
                  <div style={{ display:'grid', gridTemplateColumns: gridCols, gap:10 }}>
                    <div>
                      <label style={lbl}>Precio de Torno</label>
                      <input type='number' step='0.01' value={form.torno_price||''} onChange={e => set('torno_price', e.target.value)} style={inp} />
                    </div>
                    <div>
                      <label style={lbl}>Precio Estimado de Repuestos</label>
                      <input type='number' step='0.01' value={form.parts_price||''} onChange={e => set('parts_price', e.target.value)} style={inp} />
                    </div>
                    <div>
                      <label style={lbl}>Mano de Obra (catalogo)</label>
                      <Combobox
                        value={form.labor_article_id||''}
                        onChange={v => {
                          const art = laborArticles.find(a => String(a.id) === String(v));
                          setForm(f => ({ ...f, labor_article_id: v, labor_price: art ? art.price : f.labor_price }));
                        }}
                        options={laborArticles.map(a => ({ value:a.id, label:a.name + ' (Q' + Number(a.price).toFixed(2) + ')' }))}
                        placeholder="Seleccionar..."
                      />
                    </div>
                    <div>
                      <label style={lbl}>Precio de Mano de Obra</label>
                      <input type='number' step='0.01' value={form.labor_price||''} onChange={e => set('labor_price', e.target.value)} style={inp} />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        <div style={{ paddingBottom:32 }} />
      </div>

      <ClientFormModal
        open={showClientModal}
        onClose={() => setShowClientModal(false)}
        onSaved={handleClientSaved}
        client={null}
        quick
        clientTypes={clientTypes}
        loyaltyTiers={loyaltyTiers}
      />

      <ConfirmDialog
        open={showReportPrompt}
        onClose={() => { setShowReportPrompt(false); navigate(ordersBasePath); }}
        onConfirm={handleOpenReport}
        title="Orden creada"
        message="La orden se guardo correctamente. ¿Deseas abrir el Reporte de Trabajo ahora?"
        confirmText={openingReport ? 'Abriendo...' : 'Abrir Reporte'}
        variant="primary"
      />
    </div>
  );
}
