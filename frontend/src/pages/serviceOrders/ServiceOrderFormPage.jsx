// PANTALLA: Alta / edición de una Orden de Servicio. Es el MISMO formulario que la Orden de
// Trabajo (el talonario físico A.E.G., mismos campos, mismo orden y las mismas pestañas —
// ver WorkOrderFormPage.jsx, lib/workOrderTalonario.js y components/workOrders/
// TalonarioSections.jsx). Lo que agrega la Orden de Servicio es la captura de las firmas
// del técnico y del cliente, que se hace en la última pestaña. La firma del cliente también
// se puede capturar a control remoto: si el cliente no puede firmar en el momento en la
// pantalla, se genera un enlace público (sin sesión) que el técnico le comparte para que
// firme desde su propio teléfono — mismo mecanismo que ya existe en Reportes de Trabajo.
//
// Los datos de la antigua "visita de campo" (mediciones eléctricas, condiciones del pozo…)
// siguen guardados en la base pero ya no se muestran.
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FileSearch } from 'lucide-react';
import { serviceOrdersApi } from '../../api/serviceOrdersApi.js';
import { clientsApi } from '../../api/clientsApi.js';
import { articlesApi } from '../../api/articlesApi.js';
import { notify } from '../../lib/toast.js';
import { useIsMobile } from '../../hooks/useIsMobile.js';
import Combobox from '../../components/ui/Combobox.jsx';
import CurrencyInput from '../../components/ui/CurrencyInput.jsx';
import PdfViewerModal from '../../components/ui/PdfViewerModal.jsx';
import ClientPicker from '../../components/clients/ClientPicker.jsx';
import MachinePicker from '../../components/machines/MachinePicker.jsx';
import SignaturePad from '../../components/reports/SignaturePad.jsx';
import {
  C, inp, lbl, sec, secBody, SectionHeader,
  GeneralTab, MeasurementTab, ComponentsTab, ScrewsTab, ObservationsTab, ClosingFields,
} from '../../components/workOrders/TalonarioSections.jsx';
import {
  DEFAULT_ITEMS, emptyScrews, emptyEquipmentType, emptyMeasurementIntake, emptyMeasurementDelivery,
  normalizeEquipmentType, normalizeMeasurement, deriveEquipmentName, deriveWorkType,
} from '../../lib/workOrderTalonario.js';

const STATUS_OPTIONS = [
  { value:'programada', label:'Programada' },
  { value:'en_proceso', label:'En Proceso' },
  { value:'completada', label:'Completada' },
  { value:'cancelada',  label:'Cancelada' },
];
const STATUS_COLORS = { programada:'#3b82f6', en_proceso:'#CA8A04', completada:'#10b981', cancelada:'#ef4444' };
const LABOR_ARTICLE_TYPE_ID = 4; // catalogo "Mano de Obra", el mismo que usa la Orden de Trabajo

// Mismas pestañas que la Orden de Trabajo; la última suma los precios y las firmas.
const TABS = [
  { id:'general', label:'Datos Generales' },
  { id:'medicion_ingreso', label:'Med. de ingreso' },
  { id:'componentes', label:'Componentes' },
  { id:'tornillos', label:'Tornillos' },
  { id:'observaciones', label:'Observaciones' },
  { id:'medicion_entrega', label:'Med. de entrega' },
  { id:'cierre', label:'Cierre y precios' },
];

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
  const [laborArticles, setLaborArticles] = useState([]);
  const [saving, setSaving] = useState(false);
  const [orderNumber, setOrderNumber] = useState('—');
  const [signingLink, setSigningLink] = useState(null);
  const [loadingLink, setLoadingLink] = useState(false);
  const [showPdf, setShowPdf] = useState(false); // true mientras el visor de PDF esta abierto
  const [activeTab, setActiveTab] = useState('general');
  const [form, setForm] = useState({
    client_id:'', machine_id:null, received_at:new Date().toISOString().slice(0,10),
    delivery_at:'', next_service_at:'', reported_problem:'', code:'',
    authorized_by:'', project:'', status:'programada',
    equipment_name:'', equipment_type: emptyEquipmentType(), brand:'', model:'', serial:'',
    kw:'', voltage:'', amperage:'', rpm:'', hp:'', frame:'',
    pump_brand:'', pump_impeller:'', pump_bm:'', pump_seal_size:'', pump_seal_type:'',
    physical_parts:[], retainers_count:'', shaft_rectify_mm:'', bearings_count:'', bearings_mm:'', bearings_mm_2:'',
    seal_liner_mm:'', front_cover_mm:'', rear_cover_mm:'', fan_hole_mm:'', lathe_kw:'', lathe_hp:'', lathe_note:'', physical_other:'',
    screws: emptyScrews(),
    measurement_intake: emptyMeasurementIntake(), measurement_delivery: emptyMeasurementDelivery(),
    work_type:'', work_types:[], observations:'', internal_notes:'',
    quotation_number:'', dte_number:'', oc_number:'',
    tech_disarm:'', tech_assemble:'',
    supervisor_aeg_receive:'', supervisor_aeg_deliver:'', supervisor_client_deliver:'', supervisor_client_receive:'',
    shipping:'', whatsapp_number:'',
    torno_price:'', parts_price:'', labor_article_id:null, labor_price:'',
    tech_signature_url:null, tech_signature_name:null, client_signature_url:null, client_signature_name:null,
  });
  const [items, setItems] = useState(DEFAULT_ITEMS.map(n => ({ name:n, quantity:1, has_item:false })));

  useEffect(() => {
    clientsApi.list().then(setClients);
    articlesApi.listByType(LABOR_ARTICLE_TYPE_ID).then(setLaborArticles);
    if (isEdit) {
      serviceOrdersApi.get(id).then(order => {
        const { items:oi, ...rest } = order;
        setOrderNumber(rest.number || '—');
        setForm(f => ({ ...f, ...rest,
          // Las ordenes de antes de la migracion no tienen fecha de ingreso: es su fecha de visita.
          received_at: (rest.received_at || rest.visit_date)?.slice(0,10) || '',
          delivery_at: rest.delivery_at?.slice(0,10) || '',
          next_service_at: rest.next_service_at?.slice(0,10) || '',
          equipment_type: normalizeEquipmentType(rest.equipment_type),
          physical_parts: rest.physical_parts || [],
          screws: (rest.screws && rest.screws.length) ? rest.screws : emptyScrews(),
          measurement_intake: normalizeMeasurement(rest.measurement_intake, 'intake'),
          measurement_delivery: normalizeMeasurement(rest.measurement_delivery, 'delivery'),
          work_types: rest.work_types || [],
        }));
        if (oi?.length) setItems(oi);
      });
    }
  }, [id]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  // Marca o desmarca un componente (que piezas trae el equipo al llegar).
  const toggleItem = (i) => setItems(p => p.map((it, idx) => idx === i ? { ...it, has_item: !it.has_item } : it));

  const handleSubmit = async () => {
    if (!form.received_at) return notify.error('Ingresa la fecha de ingreso');
    setSaving(true);
    try {
      const payload = {
        ...form, visit_date: form.received_at,
        equipment_name: deriveEquipmentName(form), work_type: deriveWorkType(form), items,
      };
      if (isEdit) await serviceOrdersApi.update(id, payload);
      else await serviceOrdersApi.create(payload);
      notify.success(isEdit ? 'Orden actualizada' : 'Orden creada');
      navigate('/ordenes-servicio');
    } catch(e) { notify.error(e.response?.data?.message || e.response?.data?.error || e.message || 'Error al guardar'); }
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
    setForm(f => ({ ...f,
      tech_signature_url: updated.tech_signature_url, tech_signature_name: updated.tech_signature_name,
      client_signature_url: updated.client_signature_url, client_signature_name: updated.client_signature_name }));
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
  const gridCols = isMobile ? '1fr 1fr' : '1fr 1fr 1fr 1fr';

  // Lo que el sistema necesita y NO esta en el papel: va arriba de la primera pestaña.
  const extras = (
    <div style={sec}>
      <SectionHeader title="Datos del sistema" />
      <div style={secBody}>
        <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 2fr', gap:10 }}>
          <div>
            <label style={lbl}>Estado</label>
            <Combobox value={form.status} onChange={v => set('status', v)} options={STATUS_OPTIONS} />
          </div>
          <div>
            <label style={lbl}>Máquina del cliente (opcional)</label>
            <MachinePicker
              clientId={form.client_id}
              clients={clients}
              value={form.machine_id}
              onChange={v => set('machine_id', v)}
              onMachineLoaded={m => setForm(f => ({ ...f, machine_id: m.id,
                equipment_name: m.name || f.equipment_name, brand: m.brand || f.brand,
                model: m.model || f.model,
                serial: m.serial || f.serial, kw: m.kw || f.kw, voltage: m.voltage || f.voltage,
                amperage: m.amperage || f.amperage, rpm: m.rpm || f.rpm, hp: m.hp || f.hp }))}
            />
          </div>
        </div>
      </div>
    </div>
  );

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

      {/* Pestañas: las mismas que la Orden de Trabajo */}
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

        {activeTab === 'general' && (
          <GeneralTab
            form={form} set={set} setForm={setForm} isMobile={isMobile} extras={extras}
            clientPicker={<ClientPicker clients={clients} value={form.client_id} onChange={v => set('client_id', v)} />}
          />
        )}

        {activeTab === 'medicion_ingreso' && (
          <MeasurementTab title="Medición como ingresa equipo" variant="intake" isMobile={isMobile}
            value={form.measurement_intake} onChange={v => set('measurement_intake', v)} />
        )}

        {activeTab === 'componentes' && <ComponentsTab items={items} onToggle={toggleItem} isMobile={isMobile} />}

        {activeTab === 'tornillos' && <ScrewsTab value={form.screws} onChange={v => set('screws', v)} />}

        {activeTab === 'observaciones' && <ObservationsTab form={form} set={set} />}

        {activeTab === 'medicion_entrega' && (
          <MeasurementTab title="Medición como se entrega equipo" variant="delivery" isMobile={isMobile}
            value={form.measurement_delivery} onChange={v => set('measurement_delivery', v)} />
        )}

        {activeTab === 'cierre' && (
          <>
            <ClosingFields form={form} set={set} isMobile={isMobile} />

            {/* Precios estimados: NUNCA se imprimen en el PDF (igual que en la Orden de Trabajo). */}
            <div style={sec}>
              <SectionHeader title="Precios Estimados" />
              <div style={secBody}>
                <div style={{ display:'grid', gridTemplateColumns: gridCols, gap:10 }}>
                  <div>
                    <label style={lbl}>Precio de Torno</label>
                    <CurrencyInput value={form.torno_price||''} onChange={e => set('torno_price', e.target.value)} style={inp} />
                  </div>
                  <div>
                    <label style={lbl}>Precio Estimado de Repuestos</label>
                    <CurrencyInput value={form.parts_price||''} onChange={e => set('parts_price', e.target.value)} style={inp} />
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
                    <CurrencyInput value={form.labor_price||''} onChange={e => set('labor_price', e.target.value)} style={inp} />
                  </div>
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
          </>
        )}

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
