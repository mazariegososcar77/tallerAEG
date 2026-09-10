// PANTALLA: Historial de Equipo del Cliente ("expediente" del cliente — ver plan de la
// sesión). Junta, en un solo lugar, las máquinas registradas de un cliente y todo lo que
// se le ha hecho a CADA una (cotizaciones, órdenes de trabajo, visitas de servicio),
// además de lo histórico facturado. Se arma con lo que ya trae `GET /clients/:id/history`
// (clientService.getHistory) -- no hay tabla nueva, es un ensamblado de los mismos
// registros que ya existen en Cotizaciones/Órdenes/Órdenes de Servicio/Facturación.
//
// IMPORTANTE (limitación aceptada a propósito, ver plan): los registros creados ANTES de
// que existiera el selector de máquina (`MachinePicker`) no tienen `machine_id` y no se
// pueden re-vincular de forma confiable (el equipo se escribía a mano, con errores de
// tipeo). Esos quedan agrupados aparte, en "Sin equipo asociado", en vez de perderse.
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Wrench, FileText, ClipboardList, Truck, Receipt, ChevronDown, ChevronRight } from 'lucide-react';
import { clientsApi } from '../../api/clientsApi.js';
import { notify } from '../../lib/toast.js';
import { useIsMobile } from '../../hooks/useIsMobile.js';

const C = { bg:'var(--c-app)', card:'var(--c-surface)', dark:'var(--c-surface-2)', border:'var(--c-line)', text:'var(--c-text)', muted:'var(--c-muted)', orange:'#CA8A04', green:'#10b981' };

const QUOTE_STATUS = { borrador:{label:'Borrador',color:'#94a3b8'}, enviada:{label:'Enviada',color:'#3b82f6'}, aprobada:{label:'Aprobada',color:'#10b981'}, rechazada:{label:'Rechazada',color:'#ef4444'}, vencida:{label:'Vencida',color:'#f59e0b'} };
const WO_STATUS = { recibido:{label:'Recibido',color:'#1D9E75'}, en_proceso:{label:'En Proceso',color:'#CA8A04'}, listo:{label:'Listo',color:'#3b82f6'}, entregado:{label:'Entregado',color:'#6366f1'}, cancelado:{label:'Cancelado',color:'#ef4444'} };
const SO_STATUS = { programada:{label:'Programada',color:'#3b82f6'}, en_proceso:{label:'En Proceso',color:'#f59e0b'}, completada:{label:'Completada',color:'#10b981'}, cancelada:{label:'Cancelada',color:'#ef4444'} };
const INVOICE_STATUS = { pendiente_certificacion:{label:'Pendiente de Certificar',color:'#f59e0b'}, certificada:{label:'Certificada',color:'#10b981'}, anulada:{label:'Anulada',color:'#ef4444'} };

const Badge = ({ status, map }) => {
  const s = map[status] || { label: status || '—', color:'#94a3b8' };
  return <span style={{ background:s.color+'22', color:s.color, border:'1px solid '+s.color+'44', borderRadius:20, padding:'2px 9px', fontSize:11, fontWeight:700 }}>{s.label}</span>;
};

// Arma la linea de tiempo (cotizaciones + ordenes + visitas) de UNA maquina, o de "sin
// equipo asociado" si machineId es null -- misma logica en ambos casos, solo cambia el filtro.
function buildTimeline({ quotes, workOrders, serviceOrders }, machineId) {
  const belongsTo = (mid) => machineId ? String(mid) === String(machineId) : !mid;
  const items = [];
  for (const q of quotes) {
    const matches = machineId
      ? (q.equipment_data || []).some(eq => String(eq.machine_id) === String(machineId))
      : !(q.equipment_data || []).some(eq => eq.machine_id);
    if (matches) items.push({ type:'quote', id:q.id, date:q.date, number:q.number, status:q.status, path:`/cotizaciones/${q.id}/editar` });
  }
  for (const wo of workOrders) {
    if (belongsTo(wo.machine_id)) items.push({ type:'workOrder', id:wo.id, date:wo.received_at, number:wo.number, status:wo.status, flowType:wo.flow_type, path:(wo.flow_type==='post'?`/post/ordenes/${wo.id}/editar`:`/ordenes/${wo.id}/editar`) });
  }
  for (const so of serviceOrders) {
    if (belongsTo(so.machine_id)) items.push({ type:'serviceOrder', id:so.id, date:so.visit_date, number:so.number, status:so.status, path:`/ordenes-servicio/${so.id}/editar` });
  }
  return items.sort((a,b) => new Date(b.date||0) - new Date(a.date||0));
}

const TYPE_META = {
  quote: { label:'Cotización', icon:FileText, statusMap:QUOTE_STATUS },
  workOrder: { label:'Orden de Trabajo', icon:ClipboardList, statusMap:WO_STATUS },
  serviceOrder: { label:'Orden de Servicio', icon:Truck, statusMap:SO_STATUS },
};

const TimelineRow = ({ item }) => {
  const meta = TYPE_META[item.type];
  const Icon = meta.icon;
  const navigate = useNavigate();
  return (
    <div onClick={() => navigate(item.path)}
      style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 12px', borderRadius:8, background:C.dark, cursor:'pointer' }}>
      <Icon size={15} color={C.muted} />
      <span style={{ fontSize:12, color:C.text, fontWeight:600 }}>{meta.label} No. {item.number}</span>
      {item.flowType && <span style={{ fontSize:10, color:C.muted, textTransform:'uppercase' }}>({item.flowType})</span>}
      <span style={{ fontSize:11, color:C.muted, marginLeft:'auto' }}>{item.date ? new Date(item.date).toLocaleDateString('es-GT') : '—'}</span>
      <Badge status={item.status} map={meta.statusMap} />
    </div>
  );
};

const MachineCard = ({ machine, timeline, defaultOpen }) => {
  const [open, setOpen] = useState(Boolean(defaultOpen));
  return (
    <div style={{ background:C.card, border:'1px solid '+C.border, borderRadius:10, marginBottom:10, overflow:'hidden' }}>
      <div onClick={() => setOpen(o => !o)} style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 16px', cursor:'pointer' }}>
        {open ? <ChevronDown size={16} color={C.muted} /> : <ChevronRight size={16} color={C.muted} />}
        <Wrench size={16} color={C.orange} />
        <div style={{ flex:1 }}>
          <span style={{ fontWeight:700, color:C.text, fontSize:14 }}>{machine ? machine.name : 'Sin equipo asociado'}</span>
          {machine?.brand && <span style={{ fontSize:12, color:C.muted, marginLeft:8 }}>· {machine.brand}</span>}
          {machine?.serial && <span style={{ fontSize:12, color:C.muted, marginLeft:8 }}>S/N: {machine.serial}</span>}
        </div>
        <span style={{ fontSize:11, color:C.muted }}>{timeline.length} registro{timeline.length!==1?'s':''}</span>
      </div>
      {open && (
        <div style={{ padding:'0 16px 14px', display:'flex', flexDirection:'column', gap:6 }}>
          {timeline.length === 0
            ? <p style={{ fontSize:12, color:C.muted, margin:0 }}>Sin cotizaciones, órdenes o visitas registradas.</p>
            : timeline.map(item => <TimelineRow key={item.type+item.id} item={item} />)}
        </div>
      )}
    </div>
  );
};

export default function ClientHistoryPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [history, setHistory] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    clientsApi.getHistory(id).then(setHistory)
      .catch(e => notify.error(e.response?.data?.error || 'No se pudo cargar el historial'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div style={{ padding:40, textAlign:'center', color:C.muted }}>Cargando...</div>;
  if (!history) return <div style={{ padding:40, textAlign:'center', color:C.muted }}>No se encontró el cliente.</div>;

  const { client, machines, quotes, workOrders, serviceOrders, invoices, totalBilled } = history;
  const unassignedTimeline = buildTimeline({ quotes, workOrders, serviceOrders }, null);

  return (
    <div style={{ padding: isMobile ? '12px' : '20px 16px', maxWidth:900, margin:'0 auto' }}>
      <button onClick={() => navigate('/clientes')} style={{ display:'flex', alignItems:'center', gap:6, background:C.dark, border:'1px solid '+C.border, color:C.muted, padding:'7px 12px', borderRadius:6, cursor:'pointer', fontSize:12, marginBottom:16 }}>
        <ArrowLeft size={14} /> Volver a Clientes
      </button>

      {/* Encabezado del cliente */}
      <div style={{ background:C.card, border:'1px solid '+C.border, borderRadius:12, padding:'16px 18px', marginBottom:16 }}>
        <h1 style={{ fontSize:19, fontWeight:800, color:C.text, margin:'0 0 4px' }}>{client.full_name}</h1>
        <p style={{ fontSize:12, color:C.muted, margin:0 }}>
          {[client.client_type_name, client.nit && 'NIT: '+client.nit, client.dpi && 'DPI: '+client.dpi, client.phone].filter(Boolean).join(' · ')}
        </p>
      </div>

      {/* Total facturado */}
      <div style={{ background:C.card, border:'1px solid '+C.border, borderRadius:12, padding:'16px 18px', marginBottom:16, display:'flex', alignItems:'center', gap:14 }}>
        <div style={{ width:42, height:42, borderRadius:10, background:C.green+'18', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <Receipt size={20} color={C.green} />
        </div>
        <div>
          <p style={{ margin:0, fontSize:11, color:C.muted, fontWeight:700, textTransform:'uppercase', letterSpacing:'.6px' }}>Total Facturado Histórico</p>
          <p style={{ margin:0, fontSize:22, fontWeight:800, color:C.text }}>Q {totalBilled.toFixed(2)}</p>
        </div>
      </div>

      {/* Equipos */}
      <h2 style={{ fontSize:13, fontWeight:800, color:C.muted, textTransform:'uppercase', letterSpacing:'.6px', margin:'20px 0 10px' }}>
        Equipos ({machines.length})
      </h2>
      {machines.length === 0 ? (
        <p style={{ fontSize:12, color:C.muted }}>Este cliente no tiene máquinas registradas en el catálogo todavía.</p>
      ) : machines.map(m => (
        <MachineCard key={m.id} machine={m} timeline={buildTimeline({ quotes, workOrders, serviceOrders }, m.id)} defaultOpen={machines.length === 1} />
      ))}

      {/* Sin equipo asociado */}
      {unassignedTimeline.length > 0 && (
        <>
          <h2 style={{ fontSize:13, fontWeight:800, color:C.muted, textTransform:'uppercase', letterSpacing:'.6px', margin:'20px 0 10px' }}>
            Sin Equipo Asociado
          </h2>
          <MachineCard machine={null} timeline={unassignedTimeline} defaultOpen={machines.length === 0} />
        </>
      )}

      {/* Facturación */}
      <h2 style={{ fontSize:13, fontWeight:800, color:C.muted, textTransform:'uppercase', letterSpacing:'.6px', margin:'20px 0 10px' }}>
        Facturación ({invoices.length})
      </h2>
      {invoices.length === 0 ? (
        <p style={{ fontSize:12, color:C.muted }}>Sin facturas registradas.</p>
      ) : (
        <div style={{ background:C.card, border:'1px solid '+C.border, borderRadius:10, overflow:'hidden' }}>
          {invoices.map(inv => (
            <div key={inv.id} onClick={() => navigate('/facturacion?invoice='+inv.id)}
              style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', borderBottom:'1px solid '+C.border, cursor:'pointer' }}>
              <span style={{ fontSize:12, fontWeight:700, color:C.text }}>No. {inv.number}</span>
              <span style={{ fontSize:11, color:C.muted }}>{inv.date ? new Date(inv.date).toLocaleDateString('es-GT') : '—'}</span>
              <Badge status={inv.status} map={INVOICE_STATUS} />
              <span style={{ marginLeft:'auto', fontSize:13, fontWeight:800, color:C.text }}>Q {Number(inv.total).toFixed(2)}</span>
            </div>
          ))}
        </div>
      )}

      <div style={{ paddingBottom:32 }} />
    </div>
  );
}
