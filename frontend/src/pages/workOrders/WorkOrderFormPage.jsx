// PANTALLA: Alta / edición de una Orden de Trabajo. Aquí se registra el equipo
// que el cliente trajo al taller (datos técnicos), quién lo recibió, qué trabajo
// se le va a hacer, qué piezas trae el equipo, los técnicos que lo desarman y lo
// arman, y el estado (recibido → en_proceso → listo → entregado, garantia o devolucion).
// Se puede prellenar automáticamente trayendo los datos desde una cotización ya
// aprobada (llega por el link "Crear Orden" de Cotizaciones); si esa cotización
// tenía varios equipos, se puede elegir cuál de ellos usar.
//
// El formulario es el talonario físico A.E.G., campo por campo y en el mismo orden
// del papel (los campos y sus etiquetas viven en lib/workOrderTalonario.js y las
// secciones en components/workOrders/TalonarioSections.jsx, compartidas con la Orden
// de Servicio). Son demasiados campos para una sola pantalla larga, así que se
// reparten en pestañas (ver TABS). Lo que el sistema necesita y el papel no trae
// (estado, cotización vinculada, máquina del cliente) va arriba de la primera pestaña.
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
import PdfViewerModal from '../../components/ui/PdfViewerModal.jsx';
import { notify } from '../../lib/toast.js';
import { useEquipmentTypes } from '../../hooks/useEquipmentTypes.js';
import OrderNumberStamp from '../../components/workOrders/OrderNumberStamp.jsx';
import { useAuth } from '../../hooks/useAuth.js';
import { useIsMobile } from '../../hooks/useIsMobile.js';
import Combobox from '../../components/ui/Combobox.jsx';
import CurrencyInput from '../../components/ui/CurrencyInput.jsx';
import MachinePicker from '../../components/machines/MachinePicker.jsx';
import ClientPicker from '../../components/clients/ClientPicker.jsx';
import ClientFormModal from '../clients/ClientFormModal.jsx';
import {
  C, inp, lbl, sec, secBody, SectionHeader,
  GeneralTab, MeasurementTab, ComponentsTab, ScrewsTab, ObservationsTab, ClosingFields,
} from '../../components/workOrders/TalonarioSections.jsx';
import {
  DEFAULT_ITEMS, emptyScrews, emptyEquipmentType, emptyMeasurementIntake, emptyMeasurementDelivery,
  normalizeEquipmentType, normalizeMeasurement, deriveEquipmentName, deriveWorkType,
} from '../../lib/workOrderTalonario.js';

const STATUS_OPTIONS = [
  { value:'recibido',   label:'Recibido' },
  { value:'en_proceso', label:'En Proceso' },
  { value:'listo',      label:'Listo' },
  { value:'entregado',  label:'Entregado' },
  { value:'garantia',   label:'Garantía' },
  { value:'devolucion', label:'Devolución' },
];
const STATUS_COLORS = { recibido:'#1D9E75', en_proceso:'#CA8A04', listo:'#3b82f6', entregado:'#6366f1', garantia:'#8b5cf6', devolucion:'#ef4444' };
const LABOR_ARTICLE_TYPE_ID = 4; // catalogo "Mano de Obra" (ver 023_labor_catalog_seed.sql), el mismo que usa ArticleQuickModal en Cotizaciones

// Las pestañas siguen el orden del checklist (y del talonario).
const TABS = [
  { id:'general', label:'Datos Generales' },
  { id:'medicion_ingreso', label:'Med. de ingreso' },
  { id:'componentes', label:'Componentes' },
  { id:'tornillos', label:'Tornillos' },
  { id:'observaciones', label:'Observaciones' },
  { id:'medicion_entrega', label:'Med. de entrega' },
  { id:'cierre', label:'Cierre' },
];

const SaveIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/>
    <polyline points="17 21 17 13 7 13 7 21"/>
    <polyline points="7 3 7 8 15 8"/>
  </svg>
);

const ViewPdfIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <circle cx="11.5" cy="14.5" r="2.5"/>
    <line x1="13.5" y1="16.5" x2="15.5" y2="18.5"/>
  </svg>
);

export default function WorkOrderFormPage({ flowType = 'pre' }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fromQuoteId = searchParams.get('fromQuote');
  const isEdit = Boolean(id);
  const isMobile = useIsMobile();
  const { equipmentTypes } = useEquipmentTypes({ quiet: true });
  const { hasPermission } = useAuth();
  const [clients, setClients] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [clientTypes, setClientTypes] = useState([]);
  const [loyaltyTiers, setLoyaltyTiers] = useState([]);
  const [laborArticles, setLaborArticles] = useState([]);
  const [showClientModal, setShowClientModal] = useState(false);
  const [showReportPrompt, setShowReportPrompt] = useState(false);
  const [showPdf, setShowPdf] = useState(false); // true mientras el visor de PDF esta abierto
  const [createdOrderId, setCreatedOrderId] = useState(null);
  const [openingReport, setOpeningReport] = useState(false);
  const [saving, setSaving] = useState(false);
  const [orderNumber, setOrderNumber] = useState('—');
  const [sourceQuote, setSourceQuote] = useState(null);
  const [equipIndex, setEquipIndex] = useState(0);
  const [activeTab, setActiveTab] = useState('general');
  const [form, setForm] = useState({
    client_id:'', machine_id:null, received_at:new Date().toISOString().slice(0,10),
    delivery_at:'', next_service_at:'', reported_problem:'', code:'',
    authorized_by:'', project:'', status:'recibido',
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
    quotesApi.list().then(setQuotes);
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
          equipment_type: normalizeEquipmentType(rest.equipment_type),
          physical_parts: rest.physical_parts || [],
          screws: (rest.screws && rest.screws.length) ? rest.screws : emptyScrews(),
          measurement_intake: normalizeMeasurement(rest.measurement_intake, 'intake'),
          measurement_delivery: normalizeMeasurement(rest.measurement_delivery, 'delivery'),
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
  // Al elegir una cotizacion: trae la completa (el listado no incluye items) y
  // prellena cliente + datos del equipo, igual que el flujo ?fromQuote.
  const handleSelectQuote = (v) => {
    if (!v) {
      setSourceQuote(null);
      setEquipIndex(0);
      setForm(f => ({ ...f, quote_id:null, quotation_number:'' }));
      return;
    }
    quotesApi.get(v).then(quote => {
      setSourceQuote(quote);
      setEquipIndex(0);
      applyQuoteEquip(quote, 0);
    }).catch(() => notify.error('No se pudo cargar la cotizacion seleccionada'));
  };
  // Marca o desmarca un componente (que piezas trae el equipo al llegar).
  const toggleItem = (i) => setItems(p => p.map((it, idx) => idx === i ? { ...it, has_item: !it.has_item } : it));
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
    if (!form.client_id) return notify.error('Selecciona un cliente');
    setSaving(true);
    const payload = { ...form, equipment_name: deriveEquipmentName(form, equipmentTypes), work_type: deriveWorkType(form), items };
    try {
      if (isEdit) {
        await workOrdersApi.update(id, payload);
        notify.success('Orden actualizada');
        navigate(ordersBasePath);
      } else {
        const created = await workOrdersApi.create(payload);
        notify.success('Orden creada');
        if (form.flow_type === 'post') {
          setCreatedOrderId(created.id);
          setShowReportPrompt(true);
        } else {
          navigate(ordersBasePath);
        }
      }
    } catch(e) { notify.error(e.response?.data?.message || e.response?.data?.error || e.message || 'Error al guardar'); }
    finally { setSaving(false); }
  };

  // El usuario acepto abrir el reporte: lo crea (idempotente) y navega ahi.
  const handleOpenReport = async () => {
    setOpeningReport(true);
    try {
      const report = await workReportsApi.createForOrder(createdOrderId);
      navigate('/reportes/' + report.id + '/editar');
    } catch (e) {
      notify.error(e.message || 'No se pudo abrir el reporte');
      navigate(ordersBasePath);
    } finally {
      setOpeningReport(false);
    }
  };

  // Abre el PDF de la orden en el visor de la app (desde ahi se puede descargar).
  // Solo funciona si la orden ya se guardo, porque el PDF lo genera el servidor.
  const handleViewPDF = () => {
    if (!id) return notify.error('Guarda la orden primero');
    setShowPdf(true);
  };

  const statusColor = STATUS_COLORS[form.status] || '#1D9E75';
  const statusLabel = STATUS_OPTIONS.find(s => s.value === form.status)?.label || 'Recibido';
  const gridCols = isMobile ? 'minmax(0, 1fr) minmax(0, 1fr)' : 'minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr)';

  // Lo que el sistema necesita y NO esta en el papel: va arriba de la primera pestaña.
  const extras = (
    <div style={sec}>
      <SectionHeader title="Datos del sistema" />
      <div style={secBody}>
        <div style={{ display:'grid', gridTemplateColumns: isMobile ? 'minmax(0, 1fr)' : '1fr 2fr', gap:10 }}>
          <div>
            <label style={lbl}>Estado</label>
            <Combobox value={form.status} onChange={v => set('status', v)} options={STATUS_OPTIONS} />
          </div>
          <div>
            <label style={lbl}>Cotización vinculada</label>
            <Combobox
              value={form.quote_id ?? ''}
              onChange={handleSelectQuote}
              options={[
                { value:'', label:'No aplica' },
                ...quotes.map(q => ({
                  value: q.id,
                  label: `No. ${q.number}${q.client_name ? ' — ' + q.client_name : ''}`,
                  keywords: `${q.number} ${q.client_name || ''} ${q.work_type || ''}`,
                })),
              ]}
              searchable
              placeholder="No aplica"
            />
          </div>
        </div>
        <div style={{ marginTop:10 }}>
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
        {sourceQuote && (
          <div style={{ background:C.orange+'14', border:'1px solid '+C.orange+'44', borderRadius:8, padding:'10px 14px', marginTop:10, display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
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
      </div>
    </div>
  );

  return (
    <div className="-m-4 min-h-app sm:-m-6" style={{ background:C.bg, padding:0 }}>

      {/* Topbar */}
      <div style={{ background:C.card, borderBottom:'1px solid '+C.border, padding:'10px 16px', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:8 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
          <button onClick={() => navigate(ordersBasePath)} style={{ background:C.dark, border:'1px solid '+C.border, color:C.muted, padding:'9px 14px', borderRadius:6, cursor:'pointer', fontSize:12 }}>
            ← Volver
          </button>
          <span style={{ fontSize:isMobile?13:15, fontWeight:700, color:C.text }}>{isEdit ? 'Editar Orden' : 'Nueva Orden de Trabajo'}</span>
          <OrderNumberStamp value={form.number ?? ''} onChange={(v) => set('number', v)} />
          <span style={{ background:statusColor+'22', border:'1px solid '+statusColor+'44', color:statusColor, padding:'3px 10px', borderRadius:4, fontSize:11, fontWeight:700, display:'flex', alignItems:'center', gap:5 }}>
            <span style={{ width:6, height:6, background:statusColor, borderRadius:'50%', display:'inline-block' }}></span>
            {statusLabel}
          </span>
        </div>
        {!isMobile && <div style={{ display:'flex', gap:8 }}>
          {isEdit && (
            <button onClick={handleViewPDF} title="Visualizar el PDF de la orden" style={{ background:'#10b981', border:'none', color:'#fff', padding:'8px 16px', borderRadius:6, fontWeight:700, fontSize:13, cursor:'pointer', display:'flex', alignItems:'center', gap:7 }}>
              <ViewPdfIcon /> PDF
            </button>
          )}
          <button onClick={handleSubmit} disabled={saving} style={{ background:C.orange, border:'none', color:'#fff', padding:'8px 18px', borderRadius:6, fontWeight:700, fontSize:13, cursor:'pointer', display:'flex', alignItems:'center', gap:7, opacity:saving?0.7:1 }}>
            <SaveIcon /> {saving ? 'Guardando...' : 'Guardar Orden'}
          </button>
        </div>}
      </div>

      {/* Botón guardar sticky en móvil */}
      {isMobile && (
        <div style={{ position:'sticky', top:0, zIndex:100, padding:'8px 16px', background:C.bg, borderBottom:'1px solid '+C.border }}>
          <div style={{ display:'flex', gap:8 }}>
            {isEdit && (
              <button onClick={handleViewPDF} title="Visualizar el PDF de la orden" style={{ background:'#10b981', border:'none', color:'#fff', padding:'10px 14px', borderRadius:6, fontWeight:700, fontSize:13, cursor:'pointer', display:'flex', alignItems:'center', gap:7 }}>
                <ViewPdfIcon /> PDF
              </button>
            )}
            <button onClick={handleSubmit} disabled={saving} style={{ background:C.orange, border:'none', color:'#fff', padding:'10px', borderRadius:6, fontWeight:700, fontSize:13, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:7, flex:1, opacity:saving?0.7:1 }}>
              <SaveIcon /> {saving ? 'Guardando...' : 'Guardar Orden'}
            </button>
          </div>
        </div>
      )}

      {/* Pestañas: son demasiados campos (todo el talonario) para una sola pantalla larga */}
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
            clientPicker={
              <ClientPicker
                clients={clients}
                value={form.client_id}
                onChange={v => set('client_id', v)}
                canCreate={hasPermission('clients.quick-create')}
                onCreateNew={() => setShowClientModal(true)}
              />
            }
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

      {/* Visor del PDF dentro de la app (no abre otra pestaña) */}
      <PdfViewerModal
        open={showPdf}
        onClose={() => setShowPdf(false)}
        url={id ? `/api/work-orders/${id}/pdf` : null}
        fileName={`orden-${orderNumber}.pdf`}
        title={`Orden de Trabajo No. ${orderNumber}`}
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
