import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { quotesApi } from '../../api/quotesApi.js';
import { clientsApi } from '../../api/clientsApi.js';
import { articlesApi } from '../../api/articlesApi.js';
import { clientTypesApi } from '../../api/clientTypesApi.js';
import { loyaltyTiersApi } from '../../api/loyaltyTiersApi.js';
import ClientFormModal from '../clients/ClientFormModal.jsx';
import ArticleQuickModal from '../../components/quotes/ArticleQuickModal.jsx';

const STATUS_OPTIONS = [
  { value:'borrador',  label:'Borrador' },
  { value:'enviada',   label:'Enviada' },
  { value:'aprobada',  label:'Aprobada' },
  { value:'rechazada', label:'Rechazada' },
  { value:'vencida',   label:'Vencida' },
];
const STATUS_COLORS = { borrador:'#94a3b8', enviada:'#3b82f6', aprobada:'#10b981', rechazada:'#ef4444', vencida:'#f59e0b' };
const WORK_TYPES = ['Rebobinado','Mantenimiento','Reparacion','Cambio de conexion','Calculo de voltaje','Otros'];
const C = { bg:'var(--c-app)', card:'var(--c-surface)', dark:'var(--c-surface-2)', border:'var(--c-line)', input:'var(--c-surface-2)', text:'var(--c-text)', muted:'var(--c-muted)', orange:'#E8551C', green:'#10b981' };
const inp = { width:'100%', background:C.input, border:'1px solid '+C.border, color:C.text, padding:'8px 10px', borderRadius:6, fontSize:12, boxSizing:'border-box', outline:'none' };
const lbl = { display:'block', fontSize:10, fontWeight:800, color:C.muted, textTransform:'uppercase', letterSpacing:'.6px', marginBottom:5 };
const sec = { background:C.card, border:'1px solid '+C.border, borderRadius:10, marginBottom:12, overflow:'hidden' };
const secHdr = { background:C.dark, borderBottom:'1px solid '+C.border, padding:'9px 16px', display:'flex', alignItems:'center', justifyContent:'space-between' };
const secBody = { padding:'14px 16px' };
const g = (cols) => ({ display:'grid', gridTemplateColumns:cols, gap:10 });
const emptyEquipment = () => ({ name:'', brand:'', model:'', serial:'', labor:[{ description:'', quantity:1, unit_price:0 }], parts:[{ description:'', quantity:1, unit_price:0 }] });

const SaveIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/>
    <polyline points="17 21 17 13 7 13 7 21"/>
    <polyline points="7 3 7 8 15 8"/>
  </svg>
);

function ItemsTable({ items, onChange, onAdd, onRemove, color, articles, onOpenModal }) {
  return (
    <div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 70px 100px 90px 30px', gap:6, marginBottom:4 }}>
        <span style={{ ...lbl, marginBottom:0 }}>Descripcion</span>
        <span style={{ ...lbl, marginBottom:0 }}>Cant.</span>
        <span style={{ ...lbl, marginBottom:0 }}>Precio Unit.</span>
        <span style={{ ...lbl, marginBottom:0 }}>Subtotal</span>
        <span></span>
      </div>
      {items.map((item, i) => {
        const sub = (parseFloat(item.quantity)||0) * (parseFloat(item.unit_price)||0);
        return (
          <div key={i} style={{ display:'grid', gridTemplateColumns:'1fr 70px 100px 90px 30px', gap:6, marginBottom:5 }}>
            <select value={''} onChange={e => {
              if (e.target.value === '__new__') { onOpenModal && onOpenModal(); return; }
              if (e.target.value) onChange(i,'description', e.target.value);
            }} style={{ ...inp, cursor:'pointer', marginBottom: articles?.length ? 4 : 0 }}>
              <option value=''>Seleccionar o escribir...</option>
              {onOpenModal && <option value='__new__' style={{ fontWeight:700 }}>+ Agregar nuevo</option>}
              {onOpenModal && <option disabled>______________</option>}
              {(articles||[]).map(a => <option key={a.id} value={a.name}>{a.name}{a.price>0 ? ' — Q'+Number(a.price).toFixed(2) : ''}{a.quantity===0 ? ' (sin stock)' : ''}</option>)}
            </select>
            <input value={item.description} onChange={e => onChange(i,'description',e.target.value)} placeholder="O escribir descripcion..." style={{ ...inp, fontSize:11 }} />
            <input type="number" value={item.quantity} onChange={e => onChange(i,'quantity',e.target.value)} style={inp} />
            <input type="number" value={item.unit_price} onChange={e => onChange(i,'unit_price',e.target.value)} style={inp} />
            <input readOnly value={sub.toFixed(2)} style={{ ...inp, color:C.green, fontWeight:700 }} />
            <button onClick={() => onRemove(i)} disabled={items.length===1}
              style={{ background:'#ef444422', border:'1px solid #ef444444', color:'#ef4444', borderRadius:6, cursor:'pointer', opacity:items.length===1?0.3:1 }}>x</button>
          </div>
        );
      })}
      <button onClick={onAdd} style={{ marginTop:4, background:C.dark, border:'1px solid '+color+'44', color:color, padding:'5px 14px', borderRadius:6, cursor:'pointer', fontSize:11, fontWeight:600 }}>
        + Agregar linea
      </button>
    </div>
  );
}

export default function QuoteFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const [clients, setClients] = useState([]);
  const [clientTypes, setClientTypes] = useState([]);
  const [loyaltyTiers, setLoyaltyTiers] = useState([]);
  const [showClientModal, setShowClientModal] = useState(false);
  const [laborArticles, setLaborArticles] = useState([]);
  const [partArticles, setPartArticles] = useState([]);
  const [articleModal, setArticleModal] = useState(null); // 'labor' | 'part' | null
  const [saving, setSaving] = useState(false);
  const [quoteNumber, setQuoteNumber] = useState('_');
  const [form, setForm] = useState({ client_id:'', date:new Date().toISOString().slice(0,10), valid_until:'', status:'borrador', work_type:'', observations:'', discount:0 });
  const [equipments, setEquipments] = useState([emptyEquipment()]);

  useEffect(() => {
    clientsApi.list().then(setClients);
    articlesApi.listByType(4).then(setLaborArticles);
    articlesApi.listByType(2).then(setPartArticles);
    clientTypesApi.list().then(setClientTypes);
    loyaltyTiersApi.list().then(setLoyaltyTiers);
    if (isEdit) {
      quotesApi.get(id).then(quote => {
        const { items, equipment_data, ...rest } = quote;
        setQuoteNumber(rest.number || '_');
        setForm(f => ({ ...f, ...rest, date:rest.date?.slice(0,10)||'', valid_until:rest.valid_until?.slice(0,10)||'' }));
        if (equipment_data?.length) {
          const rebuilt = equipment_data.map((eq, idx) => ({
            ...eq,
            labor: items.filter(i => i.equipment_index===idx && i.item_type==='labor').map(i => ({ description:i.description, quantity:i.quantity, unit_price:i.unit_price })),
            parts: items.filter(i => i.equipment_index===idx && i.item_type==='part').map(i => ({ description:i.description, quantity:i.quantity, unit_price:i.unit_price })),
          }));
          rebuilt.forEach(eq => { if (!eq.labor.length) eq.labor=[{description:'',quantity:1,unit_price:0}]; });
          rebuilt.forEach(eq => { if (!eq.parts.length) eq.parts=[{description:'',quantity:1,unit_price:0}]; });
          setEquipments(rebuilt);
        }
      });
    }
  }, [id]);

  const set = (k, v) => setForm(f => ({ ...f, [k]:v }));
  const handleClientSaved = () => {
    clientsApi.list().then(data => { setClients(data); if (data.length>0) set('client_id', data[data.length-1].id); });
    setShowClientModal(false);
  };
  const handleArticleSaved = (created) => {
    if (articleModal === 'labor') setLaborArticles(prev => [...prev, created]);
    if (articleModal === 'part')  setPartArticles(prev => [...prev, created]);
    setArticleModal(null);
  };

  const setEqField = (ei, k, v) => setEquipments(prev => prev.map((eq,i) => i===ei ? {...eq,[k]:v} : eq));
  const addEquipment = () => setEquipments(prev => [...prev, emptyEquipment()]);
  const removeEquipment = (ei) => setEquipments(prev => prev.filter((_,i) => i!==ei));
  const setLineField = (ei, type, li, k, v) => setEquipments(prev => prev.map((eq,i) => i!==ei ? eq : {...eq,[type]:eq[type].map((line,j) => j===li ? {...line,[k]:v} : line)}));
  const addLine = (ei, type) => setEquipments(prev => prev.map((eq,i) => i===ei ? {...eq,[type]:[...eq[type],{description:'',quantity:1,unit_price:0}]} : eq));
  const removeLine = (ei, type, li) => setEquipments(prev => prev.map((eq,i) => i===ei ? {...eq,[type]:eq[type].filter((_,j) => j!==li)} : eq));
  const calcSub = (lines) => lines.reduce((s,l) => s+(parseFloat(l.quantity)||0)*(parseFloat(l.unit_price)||0), 0);
  const grandSubtotal = equipments.reduce((s,eq) => s+calcSub(eq.labor)+calcSub(eq.parts), 0);
  const discount = parseFloat(form.discount)||0;
  const grandTotal = grandSubtotal - discount;

  const handleSubmit = async () => {
    if (!form.client_id) return alert('Selecciona un cliente');
    if (!form.date) return alert('Ingresa la fecha');
    setSaving(true);
    try {
      const items = [];
      const equipment_data = equipments.map((eq,ei) => {
        eq.labor.forEach(l => items.push({...l, equipment_index:ei, item_type:'labor'}));
        eq.parts.forEach(p => items.push({...p, equipment_index:ei, item_type:'part'}));
        return { name:eq.name, brand:eq.brand, model:eq.model, serial:eq.serial };
      });
      const payload = { ...form, items, equipment_data, subtotal:grandSubtotal, total:grandTotal };
      if (isEdit) await quotesApi.update(id, payload);
      else await quotesApi.create(payload);
      navigate('/cotizaciones');
    } catch(e) { alert(e.response?.data?.message||e.response?.data?.error||e.message||'Error al guardar'); }
    finally { setSaving(false); }
  };

  const statusColor = STATUS_COLORS[form.status]||'#94a3b8';
  const statusLabel = STATUS_OPTIONS.find(s => s.value===form.status)?.label||'Borrador';

  return (
    <div style={{ background:C.bg, minHeight:'100vh', margin:'-24px', padding:0 }}>
      <div style={{ background:C.card, borderBottom:'1px solid '+C.border, padding:'10px 20px', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:10 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
          <button onClick={() => navigate('/cotizaciones')} style={{ background:C.dark, border:'1px solid '+C.border, color:'#93a8c8', padding:'6px 12px', borderRadius:6, cursor:'pointer', fontSize:12 }}>
            Volver
          </button>
          <span style={{ fontSize:15, fontWeight:700, color:C.text }}>{isEdit ? 'Editar Cotizacion' : 'Nueva Cotizacion'}</span>
          {isEdit && <span style={{ background:C.orange+'22', border:'1px solid '+C.orange+'66', color:C.orange, padding:'3px 10px', borderRadius:4, fontSize:11, fontWeight:700 }}>No. {quoteNumber}</span>}
          <span style={{ background:statusColor+'22', border:'1px solid '+statusColor+'44', color:statusColor, padding:'3px 10px', borderRadius:4, fontSize:11, fontWeight:700, display:'flex', alignItems:'center', gap:5 }}>
            <span style={{ width:6, height:6, background:statusColor, borderRadius:'50%', display:'inline-block' }}></span>
            {statusLabel}
          </span>
        </div>
        <button onClick={handleSubmit} disabled={saving} style={{ background:C.orange, border:'none', color:'#fff', padding:'8px 20px', borderRadius:6, fontWeight:700, fontSize:13, cursor:'pointer', display:'flex', alignItems:'center', gap:7, opacity:saving?0.7:1 }}>
          <SaveIcon /> {saving ? 'Guardando...' : 'Guardar Cotizacion'}
        </button>
      </div>

      <div style={{ padding:'16px 20px', maxWidth:980, margin:'0 auto' }}>
        <div style={sec}>
          <div style={secHdr}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ width:6, height:6, background:C.orange, borderRadius:'50%', display:'inline-block' }}></span>
              <span style={{ fontSize:11, fontWeight:800, color:C.orange, letterSpacing:'1px', textTransform:'uppercase' }}>Informacion General</span>
            </div>
          </div>
          <div style={secBody}>
            <div style={g('1fr 1fr 1fr 1fr')}>
              <div style={{ gridColumn:'span 2' }}>
                <label style={lbl}>Cliente *</label>
                <select value={form.client_id} onChange={e => { if (e.target.value==='__new__') { setShowClientModal(true); return; } set('client_id',e.target.value); }} style={{ ...inp, cursor:'pointer' }}>
                  <option value=''>Seleccionar cliente...</option>
                  <option value='__new__' style={{ color:C.orange, fontWeight:700 }}>+ Nuevo cliente</option>
                  <option disabled>______________</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.full_name||c.first_name}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>Fecha *</label>
                <input type="date" value={form.date||''} onChange={e => set('date',e.target.value)} style={inp} onClick={e => e.target.showPicker&&e.target.showPicker()} />
              </div>
              <div>
                <label style={lbl}>Valida hasta</label>
                <input type="date" value={form.valid_until||''} onChange={e => set('valid_until',e.target.value)} style={inp} onClick={e => e.target.showPicker&&e.target.showPicker()} />
              </div>
            </div>
            <div style={{ ...g('1fr 1fr 1fr 1fr'), marginTop:10 }}>
              <div style={{ gridColumn:'span 2' }}>
                <label style={lbl}>Tipo de Trabajo</label>
                <select value={form.work_type||''} onChange={e => set('work_type',e.target.value)} style={{ ...inp, cursor:'pointer' }}>
                  <option value=''>Seleccionar...</option>
                  {WORK_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div style={{ gridColumn:'span 2' }}>
                <label style={lbl}>Estado</label>
                <select value={form.status} onChange={e => set('status',e.target.value)} style={{ ...inp, cursor:'pointer' }}>
                  {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>
            <div style={{ marginTop:10 }}>
              <label style={lbl}>Observaciones</label>
              <textarea value={form.observations||''} onChange={e => set('observations',e.target.value)} rows={2} style={{ ...inp, resize:'vertical' }} />
            </div>
          </div>
        </div>

        {equipments.map((eq, ei) => (
          <div key={ei} style={{ ...sec, border:'1px solid #E8551C44' }}>
            <div style={secHdr}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ width:6, height:6, background:C.orange, borderRadius:'50%', display:'inline-block' }}></span>
                <span style={{ fontSize:11, fontWeight:800, color:C.orange, letterSpacing:'1px', textTransform:'uppercase' }}>
                  {equipments.length > 1 ? 'Equipo '+(ei+1) : 'Equipo'}
                </span>
              </div>
              {equipments.length > 1 && (
                <button onClick={() => removeEquipment(ei)} style={{ background:'#ef444422', border:'1px solid #ef444444', color:'#ef4444', borderRadius:6, padding:'3px 10px', cursor:'pointer', fontSize:11 }}>
                  Eliminar equipo
                </button>
              )}
            </div>
            <div style={secBody}>
              <div style={g('1fr 1fr 1fr 1fr')}>
                <div style={{ gridColumn:'span 2' }}>
                  <label style={lbl}>Nombre del Equipo / Maquina</label>
                  <input value={eq.name} onChange={e => setEqField(ei,'name',e.target.value)} placeholder="Ej: Motor trifasico" style={inp} />
                </div>
                <div>
                  <label style={lbl}>Marca</label>
                  <input value={eq.brand} onChange={e => setEqField(ei,'brand',e.target.value)} style={inp} />
                </div>
                <div>
                  <label style={lbl}>Modelo / Serie</label>
                  <input value={eq.model} onChange={e => setEqField(ei,'model',e.target.value)} style={inp} />
                </div>
              </div>
              <div style={{ marginTop:14, background:C.dark, borderRadius:8, padding:'12px 14px', border:'1px solid #3b82f633' }}>
                <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:10 }}>
                  <span style={{ fontSize:13 }}>Mano de Obra</span>
                  <span style={{ fontSize:11, color:C.muted, marginLeft:'auto' }}>Q {calcSub(eq.labor).toFixed(2)}</span>
                </div>
                <ItemsTable items={eq.labor} onChange={(li,k,v) => setLineField(ei,'labor',li,k,v)} onAdd={() => addLine(ei,'labor')} onRemove={li => removeLine(ei,'labor',li)} color="#3b82f6" articles={laborArticles} onOpenModal={() => setArticleModal('labor')} />
              </div>
              <div style={{ marginTop:10, background:C.dark, borderRadius:8, padding:'12px 14px', border:'1px solid #10b98133' }}>
                <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:10 }}>
                  <span style={{ fontSize:13 }}>Repuestos</span>
                  <span style={{ fontSize:11, color:C.muted, marginLeft:'auto' }}>Q {calcSub(eq.parts).toFixed(2)}</span>
                </div>
                <ItemsTable items={eq.parts} onChange={(li,k,v) => setLineField(ei,'parts',li,k,v)} onAdd={() => addLine(ei,'parts')} onRemove={li => removeLine(ei,'parts',li)} color="#10b981" articles={partArticles} onOpenModal={() => setArticleModal('part')} />
              </div>
              <div style={{ marginTop:10, textAlign:'right', fontSize:12, color:C.muted }}>
                Subtotal equipo: <strong style={{ color:C.text }}>Q {(calcSub(eq.labor)+calcSub(eq.parts)).toFixed(2)}</strong>
              </div>
            </div>
          </div>
        ))}

        <button onClick={addEquipment} style={{ width:'100%', background:C.dark, border:'2px dashed '+C.border, color:C.muted, padding:'12px', borderRadius:10, cursor:'pointer', fontSize:13, fontWeight:600, marginBottom:12 }}>
          + Agregar otro equipo
        </button>

        <div style={{ ...sec }}>
          <div style={secBody}>
            <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:10 }}>
              <div style={{ display:'flex', gap:16, alignItems:'center' }}>
                <span style={lbl}>Subtotal</span>
                <span style={{ color:C.text, fontWeight:600, fontSize:14, minWidth:120, textAlign:'right' }}>Q {grandSubtotal.toFixed(2)}</span>
              </div>
              <div style={{ display:'flex', gap:16, alignItems:'center' }}>
                <span style={lbl}>Descuento (Q)</span>
                <input type="number" value={form.discount} onChange={e => set('discount',e.target.value)} style={{ ...inp, width:120, textAlign:'right' }} />
              </div>
              <div style={{ display:'flex', gap:16, alignItems:'center', borderTop:'2px solid '+C.orange+'44', paddingTop:10 }}>
                <span style={{ fontSize:14, fontWeight:800, color:C.orange, textTransform:'uppercase', letterSpacing:1 }}>Total</span>
                <span style={{ color:C.orange, fontWeight:800, fontSize:24, minWidth:120, textAlign:'right' }}>Q {grandTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
        <div style={{ paddingBottom:32 }} />
      </div>

      <ArticleQuickModal
        open={articleModal !== null}
        onClose={() => setArticleModal(null)}
        onSaved={handleArticleSaved}
        type={articleModal || 'labor'}
      />
      <ClientFormModal open={showClientModal} onClose={() => setShowClientModal(false)} onSaved={handleClientSaved} client={null} clientTypes={clientTypes} loyaltyTiers={loyaltyTiers} />
    </div>
  );
}
