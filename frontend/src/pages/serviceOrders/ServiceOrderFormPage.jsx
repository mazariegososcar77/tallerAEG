// PANTALLA: Alta / edición de una Orden de Servicio — el formato real que usa el taller
// para documentar una VISITA TÉCNICA DE CAMPO (servicio de bombas/pozos en el sitio del
// cliente): datos del cliente, fuente de energía, mediciones eléctricas, condiciones del
// equipo, componentes instalados, especificaciones adicionales, reporte técnico y las
// firmas del técnico y del cliente. Reproduce, sección por sección, el papel que ya usaba
// el taller. La firma del cliente también se puede capturar a control remoto: si el
// cliente no puede firmar en el momento en la pantalla, se genera un enlace público (sin
// sesión) que el técnico le comparte para que firme desde su propio teléfono — mismo
// mecanismo que ya existe en Reportes de Trabajo (ver WorkReportFormPage.jsx).
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FileSearch } from 'lucide-react';
import { serviceOrdersApi } from '../../api/serviceOrdersApi.js';
import { clientsApi } from '../../api/clientsApi.js';
import { withUppercase } from '../../lib/text.js';
import { notify } from '../../lib/toast.js';
import { useIsMobile } from '../../hooks/useIsMobile.js';
import Combobox from '../../components/ui/Combobox.jsx';
import PdfViewerModal from '../../components/ui/PdfViewerModal.jsx';
import ClientPicker from '../../components/clients/ClientPicker.jsx';
import MachinePicker from '../../components/machines/MachinePicker.jsx';
import SignaturePad from '../../components/reports/SignaturePad.jsx';

const STATUS_OPTIONS = [
  { value:'programada', label:'Programada' },
  { value:'en_proceso', label:'En Proceso' },
  { value:'completada', label:'Completada' },
  { value:'cancelada',  label:'Cancelada' },
];
const STATUS_COLORS = { programada:'#3b82f6', en_proceso:'#CA8A04', completada:'#10b981', cancelada:'#ef4444' };

const MEASUREMENT_ROWS = [
  { key:'sin_trabajar', label:'Voltaje / Sin trabajar' },
  { key:'trabajando',   label:'Trabajando' },
  { key:'resistencia',  label:'Resistencia línea a línea' },
  { key:'monofasico',   label:'Monofásico' },
  { key:'aislamiento',  label:'Medición de aislamiento' },
  { key:'amperios',     label:'Amperios en placa' },
];
const emptyMeasurements = () => MEASUREMENT_ROWS.map(r => ({ key:r.key, c1:'', c2:'', c3:'', c4:'', c5:'', c6:'', nota:'' }));

const COMPONENT_ROWS = ['Motor','Bomba','Tanque','Ablandador','Contactor','Flip-On','Presostato','Guardanivel','Protector Fase','Timer','Válv. Pie','Válv. Cheque','Válv. Esfera'];
const emptyComponents = () => COMPONENT_ROWS.map(name => ({ component:name, marca:'', modelo:'', serie:'', especificacion:'', valor:'' }));

const ADDITIONAL_SPEC_FIELDS = [
  ['hp_motor','HP (Motor)'], ['voltaje','Voltaje'], ['hp_bomba','HP (Bomba)'], ['etapas','Etapas'],
  ['precarga_tanque','Precarga del Tanque'], ['tipo_filtro','Tipo de Filtro / Lbs.'],
  ['bimetalico','Bimetálico Graduado a'], ['tamano','Tamaño'], ['rango_presion','Rango de Presión (PSI)'],
  ['distancia_electrodos','Distancia entre Electrodos'], ['alto_volt','Alto Volt.'], ['bajo_volt','Bajo Volt.'],
  ['desb','Desb.'], ['retardo','Retardo'], ['programacion','Programación'], ['manometro','Manómetro'],
  ['cheque_bypass','Cheque By-Pass'], ['recirculacion','Recirculación'], ['valv_flote','Válv. Flote'],
];
const emptySpecs = () => Object.fromEntries(ADDITIONAL_SPEC_FIELDS.map(([k]) => [k, '']));

const C = { bg:'var(--c-app)', card:'var(--c-surface)', dark:'var(--c-surface-2)', border:'var(--c-line)', input:'var(--c-surface-2)', text:'var(--c-text)', muted:'var(--c-muted)', orange:'#CA8A04' };
const inp = { width:'100%', background:C.input, border:'1px solid '+C.border, color:C.text, padding:'8px 10px', borderRadius:6, fontSize:12, boxSizing:'border-box', outline:'none' };
const inpSm = { ...inp, padding:'5px 6px', fontSize:11 };
const lbl = { display:'block', fontSize:10, fontWeight:800, color:C.muted, textTransform:'uppercase', letterSpacing:'.6px', marginBottom:5 };
const sec = { background:C.card, border:'1px solid '+C.border, borderRadius:10, marginBottom:12, overflow:'hidden' };
const secHdr = { background:C.dark, borderBottom:'1px solid '+C.border, padding:'9px 16px', display:'flex', alignItems:'center', gap:8 };
const secTtl = { fontSize:11, fontWeight:800, color:C.orange, letterSpacing:'1px', textTransform:'uppercase' };
const secBody = { padding:'14px 16px' };

const SectionHeader = ({ title }) => (
  <div style={secHdr}>
    <span style={{ width:6, height:6, background:C.orange, borderRadius:'50%', display:'inline-block' }}></span>
    <span style={secTtl}>{title}</span>
  </div>
);
const SaveIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>
  </svg>
);
export default function ServiceOrderFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const isMobile = useIsMobile();
  const [clients, setClients] = useState([]);
  const [saving, setSaving] = useState(false);
  const [orderNumber, setOrderNumber] = useState('—');
  const [signingLink, setSigningLink] = useState(null);
  const [loadingLink, setLoadingLink] = useState(false);
  const [showPdf, setShowPdf] = useState(false); // true mientras el visor de PDF esta abierto
  const [form, setForm] = useState({
    client_id:'', machine_id:null, caller_name:'', client_address:'', client_nit:'', client_phone:'',
    visit_date:new Date().toISOString().slice(0,10), visit_time:'', reported_problem:'',
    equipment_name:'', brand:'', model:'', serial:'', status:'programada',
    transformer_bank:'', generator:'', voltage_source:'',
    pump_from:'', pump_to:'', well_type:'', diameter:'', total_depth:'', static_level:'',
    dynamic_level:'', gpm:'', pipe_count:'', air_line:'', cable_gauge:'', sleeve:'', pool_dimensions:'',
    technical_report:'', arrival_time:'', departure_time:'',
    tech_signature_url:null, tech_signature_name:null, client_signature_url:null, client_signature_name:null,
  });
  const [measurements, setMeasurements] = useState(emptyMeasurements());
  const [components, setComponents] = useState(emptyComponents());
  const [specs, setSpecs] = useState(emptySpecs());

  useEffect(() => {
    clientsApi.list().then(setClients);
    if (isEdit) {
      serviceOrdersApi.get(id).then(order => {
        setOrderNumber(order.number || '—');
        setForm(f => ({ ...f, ...order,
          visit_date: order.visit_date?.slice(0,10) || '',
        }));
        if (order.electrical_measurements?.length) setMeasurements(order.electrical_measurements);
        if (order.installed_components?.length) setComponents(order.installed_components);
        if (order.additional_specs) setSpecs(s => ({ ...s, ...order.additional_specs }));
      });
    }
  }, [id]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setMeasurement = (i, k, v) => setMeasurements(prev => prev.map((r, idx) => idx === i ? { ...r, [k]: v } : r));
  const setComponent = (i, k, v) => setComponents(prev => prev.map((r, idx) => idx === i ? { ...r, [k]: v } : r));
  const setSpec = (k, v) => setSpecs(prev => ({ ...prev, [k]: v }));

  const handleSubmit = async () => {
    if (!form.visit_date) return notify.error('Ingresa la fecha de visita');
    setSaving(true);
    try {
      const payload = { ...form, electrical_measurements: measurements, installed_components: components, additional_specs: specs };
      if (isEdit) await serviceOrdersApi.update(id, payload);
      else await serviceOrdersApi.create(payload);
      notify.success(isEdit ? 'Orden actualizada' : 'Orden creada');
      navigate('/ordenes-servicio');
    } catch(e) { notify.error(e.response?.data?.error || e.message || 'Error al guardar'); }
    finally { setSaving(false); }
  };

  // Abre el PDF de la orden en el visor de la app (desde ahi se puede descargar).
  const handleViewPDF = () => {
    if (!id) return notify.error('Guarda la orden primero');
    setShowPdf(true);
  };

  // Guarda la firma dibujada en la app (tecnico o cliente en persona).
  const handleSaveSignature = async (role, file, name) => {
    if (!isEdit) return notify.error('Guarda la orden primero para poder firmarla');
    const updated = await serviceOrdersApi.setSignature(id, file, role, name);
    setForm(f => ({ ...f, ...updated }));
  };

  // Genera (o recupera) el enlace publico para que el cliente firme desde su propio
  // telefono cuando no puede hacerlo en el momento en la app.
  const handleGenerateLink = async () => {
    setLoadingLink(true);
    try {
      const { token } = await serviceOrdersApi.getSigningLink(id);
      setSigningLink(`${window.location.origin}/firmar/${token}`);
    } catch (e) {
      notify.error(e.message || 'No se pudo generar el enlace');
    } finally {
      setLoadingLink(false);
    }
  };

  const statusColor = STATUS_COLORS[form.status] || '#3b82f6';
  const statusLabel = STATUS_OPTIONS.find(s => s.value === form.status)?.label || 'Programada';
  const g4 = isMobile ? '1fr 1fr' : '1fr 1fr 1fr 1fr';
  const g3 = isMobile ? '1fr 1fr' : '1fr 1fr 1fr';
  const g2 = isMobile ? '1fr' : '1fr 1fr';

  return (
    <div style={{ background:C.bg, minHeight:'100vh', margin:'-24px', padding:0 }}>
      <div style={{ background:C.card, borderBottom:'1px solid '+C.border, padding:'10px 16px', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:8 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
          <button onClick={() => navigate('/ordenes-servicio')} style={{ background:C.dark, border:'1px solid '+C.border, color:'#8fb3a0', padding:'6px 12px', borderRadius:6, cursor:'pointer', fontSize:12 }}>
            ← Volver
          </button>
          <span style={{ fontSize:isMobile?13:15, fontWeight:700, color:C.text }}>{isEdit ? 'Editar Orden de Servicio' : 'Nueva Orden de Servicio'}</span>
          {isEdit && <span style={{ background:C.orange+'22', border:'1px solid '+C.orange+'66', color:C.orange, padding:'3px 10px', borderRadius:4, fontSize:11, fontWeight:700 }}>No. {orderNumber}</span>}
          <span style={{ background:statusColor+'22', border:'1px solid '+statusColor+'44', color:statusColor, padding:'3px 10px', borderRadius:4, fontSize:11, fontWeight:700, display:'flex', alignItems:'center', gap:5 }}>
            <span style={{ width:6, height:6, background:statusColor, borderRadius:'50%', display:'inline-block' }}></span>
            {statusLabel}
          </span>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          {isEdit && (
            <button onClick={handleViewPDF} title="Visualizar el PDF de la orden" style={{ background:'#10b981', border:'none', color:'#fff', padding:'8px 16px', borderRadius:6, fontWeight:700, fontSize:13, cursor:'pointer', display:'flex', alignItems:'center', gap:7 }}>
              <FileSearch size={14} strokeWidth={2.5} /> PDF
            </button>
          )}
          <button onClick={handleSubmit} disabled={saving} style={{ background:C.orange, border:'none', color:'#fff', padding:'8px 18px', borderRadius:6, fontWeight:700, fontSize:13, cursor:'pointer', display:'flex', alignItems:'center', gap:7, opacity:saving?0.7:1 }}>
            <SaveIcon /> {saving ? 'Guardando...' : 'Guardar Orden'}
          </button>
        </div>
      </div>

      <div style={{ padding: isMobile ? '12px' : '16px 20px', maxWidth:1000, margin:'0 auto' }}>

        {/* 1. DATOS DEL CLIENTE */}
        <div style={sec}>
          <SectionHeader title="Datos del Cliente" />
          <div style={secBody}>
            <div style={{ display:'grid', gridTemplateColumns:g2, gap:10 }}>
              <div>
                <label style={lbl}>Cliente (catálogo, opcional)</label>
                <ClientPicker clients={clients} value={form.client_id} onChange={v => set('client_id', v)} />
              </div>
              <div><label style={lbl}>Nombre del Cliente / Dirección</label><input value={form.client_address||''} onChange={withUppercase(e => set('client_address', e.target.value))} style={inp} placeholder="Dirección" /></div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:g4, gap:10, marginTop:10 }}>
              <div><label style={lbl}>Persona que llamó</label><input value={form.caller_name||''} onChange={withUppercase(e => set('caller_name', e.target.value))} style={inp} /></div>
              <div><label style={lbl}>NIT</label><input value={form.client_nit||''} onChange={withUppercase(e => set('client_nit', e.target.value))} style={inp} /></div>
              <div><label style={lbl}>Teléfono</label><input value={form.client_phone||''} onChange={e => set('client_phone', e.target.value)} style={inp} /></div>
              <div>
                <label style={lbl}>Estado</label>
                <Combobox value={form.status} onChange={v => set('status', v)} options={STATUS_OPTIONS} />
              </div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:g4, gap:10, marginTop:10 }}>
              <div>
                <label style={lbl}>Fecha *</label>
                <input type='date' value={form.visit_date||''} onChange={e => set('visit_date', e.target.value)} style={inp}
                  onClick={e => e.target.showPicker && e.target.showPicker()} />
              </div>
              <div><label style={lbl}>Hora</label><input type='time' value={form.visit_time||''} onChange={e => set('visit_time', e.target.value)} style={inp} /></div>
              <div style={{ gridColumn:'span 2' }}><label style={lbl}>Tipo de Equipo</label><input value={form.equipment_name||''} onChange={withUppercase(e => set('equipment_name', e.target.value))} style={inp} /></div>
            </div>
            <div style={{ marginTop:10 }}>
              <label style={lbl}>Máquina del Cliente (opcional)</label>
              <MachinePicker
                clientId={form.client_id}
                clients={clients}
                value={form.machine_id}
                onChange={v => set('machine_id', v)}
                onMachineLoaded={m => setForm(f => ({ ...f, machine_id: m.id,
                  equipment_name: m.name || f.equipment_name, brand: m.brand || f.brand,
                  model: m.model || f.model, serial: m.serial || f.serial }))}
              />
            </div>
            <div style={{ display:'grid', gridTemplateColumns:g3, gap:10, marginTop:10 }}>
              <div><label style={lbl}>Marca</label><input value={form.brand||''} onChange={withUppercase(e => set('brand', e.target.value))} style={inp} /></div>
              <div><label style={lbl}>Modelo</label><input value={form.model||''} onChange={withUppercase(e => set('model', e.target.value))} style={inp} /></div>
              <div><label style={lbl}>Serie</label><input value={form.serial||''} onChange={withUppercase(e => set('serial', e.target.value))} style={inp} /></div>
            </div>
            <div style={{ marginTop:10 }}>
              <label style={lbl}>Problema Reportado</label>
              <textarea value={form.reported_problem||''} onChange={withUppercase(e => set('reported_problem', e.target.value))} rows={2} style={{ ...inp, resize:'vertical' }} />
            </div>
          </div>
        </div>

        {/* 2. FUENTE DE ENERGÍA */}
        <div style={sec}>
          <SectionHeader title="Fuente de Energía" />
          <div style={secBody}>
            <div style={{ display:'grid', gridTemplateColumns:g3, gap:10 }}>
              <div><label style={lbl}>Banco de Transformadores</label><input value={form.transformer_bank||''} onChange={e => set('transformer_bank', e.target.value)} style={inp} placeholder="kva" /></div>
              <div><label style={lbl}>Generador</label><input value={form.generator||''} onChange={e => set('generator', e.target.value)} style={inp} placeholder="kva/kw" /></div>
              <div><label style={lbl}>Voltaje</label><input value={form.voltage_source||''} onChange={e => set('voltage_source', e.target.value)} style={inp} /></div>
            </div>
          </div>
        </div>

        {/* 3. MEDICIONES ELÉCTRICAS */}
        <div style={sec}>
          <SectionHeader title="Mediciones Eléctricas de la Fuente y el Motor" />
          <div style={{ ...secBody, overflowX:'auto' }}>
            <table style={{ width:'100%', minWidth:640, borderCollapse:'collapse', fontSize:11 }}>
              <thead>
                <tr>
                  <th style={{ textAlign:'left', padding:'4px 6px', color:C.muted, fontSize:10, textTransform:'uppercase' }}>Medición</th>
                  {[1,2,3,4,5,6].map(n => <th key={n} style={{ padding:'4px 6px', color:C.muted, fontSize:10 }}>Col. {n}</th>)}
                  <th style={{ padding:'4px 6px', color:C.muted, fontSize:10 }}>Nota</th>
                </tr>
              </thead>
              <tbody>
                {MEASUREMENT_ROWS.map((row, i) => (
                  <tr key={row.key}>
                    <td style={{ padding:'3px 6px', fontWeight:700, color:C.text, whiteSpace:'nowrap' }}>{row.label}</td>
                    {['c1','c2','c3','c4','c5','c6'].map(c => (
                      <td key={c} style={{ padding:'2px' }}><input value={measurements[i]?.[c]||''} onChange={e => setMeasurement(i, c, e.target.value)} style={inpSm} /></td>
                    ))}
                    <td style={{ padding:'2px' }}><input value={measurements[i]?.nota||''} onChange={e => setMeasurement(i, 'nota', e.target.value)} style={inpSm} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 4. CONDICIONES DE TRABAJO DEL EQUIPO */}
        <div style={sec}>
          <SectionHeader title="Condiciones de Trabajo del Equipo" />
          <div style={secBody}>
            <div style={{ display:'grid', gridTemplateColumns:g4, gap:10 }}>
              <div><label style={lbl}>Bombea de</label><input value={form.pump_from||''} onChange={e => set('pump_from', e.target.value)} style={inp} /></div>
              <div><label style={lbl}>A</label><input value={form.pump_to||''} onChange={e => set('pump_to', e.target.value)} style={inp} /></div>
              <div>
                <label style={lbl}>Tipo Pozo</label>
                <Combobox value={form.well_type||''} onChange={v => set('well_type', v)} options={[{value:'sumergible',label:'Sumergible'},{value:'centrifuga',label:'Centrífuga'}]} placeholder="Seleccionar..." />
              </div>
              <div><label style={lbl}>Diámetro</label><input value={form.diameter||''} onChange={e => set('diameter', e.target.value)} style={inp} /></div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:g4, gap:10, marginTop:10 }}>
              <div><label style={lbl}>Profundidad Total</label><input value={form.total_depth||''} onChange={e => set('total_depth', e.target.value)} style={inp} /></div>
              <div><label style={lbl}>Nivel Estático</label><input value={form.static_level||''} onChange={e => set('static_level', e.target.value)} style={inp} /></div>
              <div><label style={lbl}>Nivel Dinámico</label><input value={form.dynamic_level||''} onChange={e => set('dynamic_level', e.target.value)} style={inp} /></div>
              <div><label style={lbl}>GPM</label><input value={form.gpm||''} onChange={e => set('gpm', e.target.value)} style={inp} /></div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:g4, gap:10, marginTop:10 }}>
              <div><label style={lbl}>Cantidad de Tubos</label><input value={form.pipe_count||''} onChange={e => set('pipe_count', e.target.value)} style={inp} /></div>
              <div><label style={lbl}>Línea Aire</label><input value={form.air_line||''} onChange={e => set('air_line', e.target.value)} style={inp} /></div>
              <div><label style={lbl}>Calibre de Cable</label><input value={form.cable_gauge||''} onChange={e => set('cable_gauge', e.target.value)} style={inp} /></div>
              <div><label style={lbl}>Funda</label><input value={form.sleeve||''} onChange={e => set('sleeve', e.target.value)} style={inp} /></div>
            </div>
            <div style={{ marginTop:10 }}>
              <label style={lbl}>Dimensiones de la Piscina</label>
              <input value={form.pool_dimensions||''} onChange={e => set('pool_dimensions', e.target.value)} style={inp} />
            </div>
          </div>
        </div>

        {/* 5. DATOS DEL EQUIPO Y COMPONENTES INSTALADOS */}
        <div style={sec}>
          <SectionHeader title="Datos del Equipo y Componentes Instalados" />
          <div style={{ ...secBody, overflowX:'auto' }}>
            <table style={{ width:'100%', minWidth:640, borderCollapse:'collapse', fontSize:11 }}>
              <thead>
                <tr>
                  <th style={{ textAlign:'left', padding:'4px 6px', color:C.muted, fontSize:10, textTransform:'uppercase' }}>Componente</th>
                  <th style={{ padding:'4px 6px', color:C.muted, fontSize:10 }}>Marca</th>
                  <th style={{ padding:'4px 6px', color:C.muted, fontSize:10 }}>Modelo</th>
                  <th style={{ padding:'4px 6px', color:C.muted, fontSize:10 }}>Serie</th>
                  <th style={{ padding:'4px 6px', color:C.muted, fontSize:10 }}>Especificación</th>
                  <th style={{ padding:'4px 6px', color:C.muted, fontSize:10 }}>Valor</th>
                </tr>
              </thead>
              <tbody>
                {COMPONENT_ROWS.map((name, i) => (
                  <tr key={name}>
                    <td style={{ padding:'3px 6px', fontWeight:700, color:C.text, whiteSpace:'nowrap' }}>{name}</td>
                    {['marca','modelo','serie','especificacion','valor'].map(c => (
                      <td key={c} style={{ padding:'2px' }}><input value={components[i]?.[c]||''} onChange={e => setComponent(i, c, e.target.value)} style={inpSm} /></td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 6. ESPECIFICACIONES ADICIONALES */}
        <div style={sec}>
          <SectionHeader title="Especificaciones Adicionales" />
          <div style={secBody}>
            <div style={{ display:'grid', gridTemplateColumns:g3, gap:10 }}>
              {ADDITIONAL_SPEC_FIELDS.map(([key, label]) => (
                <div key={key}><label style={lbl}>{label}</label><input value={specs[key]||''} onChange={e => setSpec(key, e.target.value)} style={inp} /></div>
              ))}
            </div>
          </div>
        </div>

        {/* 7. REPORTE TÉCNICO */}
        <div style={sec}>
          <SectionHeader title="Reporte Técnico" />
          <div style={secBody}>
            <textarea value={form.technical_report||''} onChange={e => set('technical_report', e.target.value)} rows={6} style={{ ...inp, resize:'vertical' }} />
            <div style={{ display:'grid', gridTemplateColumns:g2, gap:10, marginTop:10 }}>
              <div><label style={lbl}>Hora de Llegada</label><input type='time' value={form.arrival_time||''} onChange={e => set('arrival_time', e.target.value)} style={inp} /></div>
              <div><label style={lbl}>Hora de Salida de Obra</label><input type='time' value={form.departure_time||''} onChange={e => set('departure_time', e.target.value)} style={inp} /></div>
            </div>
          </div>
        </div>

        {/* FIRMAS */}
        <div style={sec}>
          <SectionHeader title="Firmas" />
          <div style={{ ...secBody, display:'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap:20 }}>
            <SignaturePad
              label="Firma Técnico"
              signatureUrl={form.tech_signature_url}
              signatureName={form.tech_signature_name}
              onSave={(file, name) => handleSaveSignature('tech', file, name)}
              disabled={!isEdit}
            />
            <div>
              <SignaturePad
                label="F) Cliente"
                signatureUrl={form.client_signature_url}
                signatureName={form.client_signature_name}
                onSave={(file, name) => handleSaveSignature('client', file, name)}
                disabled={!isEdit}
              />
              {isEdit && !form.client_signature_url && (
                <div style={{ marginTop: 10 }}>
                  {!signingLink ? (
                    <button type="button" onClick={handleGenerateLink} disabled={loadingLink}
                      style={{ background: C.dark, border: '1px solid ' + C.border, color: C.orange, padding: '7px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 700, opacity: loadingLink ? 0.7 : 1 }}>
                      {loadingLink ? 'Generando...' : 'Generar enlace para firma remota'}
                    </button>
                  ) : (
                    <div style={{ background: C.dark, border: '1px solid ' + C.border, borderRadius: 8, padding: '10px 12px' }}>
                      <p style={{ margin: '0 0 6px', fontSize: 11, color: C.muted }}>
                        Comparte este enlace con el cliente: lo abre en su celular, firma y escribe su nombre — sin necesitar cuenta en el sistema.
                      </p>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <input readOnly value={signingLink} onFocus={e => e.target.select()} style={{ ...inp, flex: 1, minWidth: 180, fontSize: 11 }} />
                        <button type="button" onClick={() => { navigator.clipboard.writeText(signingLink); notify.success('Enlace copiado'); }}
                          style={{ background: C.card, border: '1px solid ' + C.border, color: C.text, padding: '0 12px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                          Copiar
                        </button>
                        <a href={`https://wa.me/?text=${encodeURIComponent('Por favor firma aquí: ' + signingLink)}`} target="_blank" rel="noreferrer"
                          style={{ background: '#25D366', border: 'none', color: '#fff', padding: '0 12px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
                          Enviar por WhatsApp
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              )}
              {!isEdit && <p style={{ fontSize:11, color:C.muted, marginTop:6 }}>Guarda la orden primero para poder firmarla o generar el enlace remoto.</p>}
            </div>
          </div>
        </div>
        <div style={{ paddingBottom:32 }} />
      </div>

      {/* Visor del PDF dentro de la app (no abre otra pestaña) */}
      <PdfViewerModal
        open={showPdf}
        onClose={() => setShowPdf(false)}
        url={id ? `/api/service-orders/${id}/pdf` : null}
        fileName={`orden-servicio-${orderNumber}.pdf`}
        title={`Orden de Servicio No. ${orderNumber}`}
      />
    </div>
  );
}
