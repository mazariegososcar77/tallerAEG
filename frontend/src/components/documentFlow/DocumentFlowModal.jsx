// Modal "Mapa de Relaciones" (al estilo del Document Flow de SAP): muestra la
// cadena completa de documentos ligados a una Cotizacion, Orden de Trabajo,
// Reporte de Trabajo o Factura -- Cotizacion -> Orden(es) de Trabajo -> Reporte
// -> Factura -- con su estado, y deja saltar a cualquiera de ellos con un clic.
// Es de solo lectura: no crea ni edita nada, solo visualiza y navega.
//
// Se abre igual desde las 4 pantallas (Cotizaciones, Ordenes de Trabajo, Reportes
// de Trabajo y Facturacion): `source` = { type, id } le dice a cual de los 4
// endpoints de documento-flujo llamar; el backend siempre devuelve la misma forma
// { viewing, quote, orders[] } sin importar por cual de los 4 se haya entrado, asi
// que este componente no necesita saber nada especial segun el origen.
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, ClipboardList, Camera, Receipt, ArrowRight, ArrowDown, MapPin } from 'lucide-react';
import Modal from '../ui/Modal.jsx';
import Spinner from '../ui/Spinner.jsx';
import { notify } from '../../lib/toast.js';
import { useIsMobile } from '../../hooks/useIsMobile.js';
import { quotesApi } from '../../api/quotesApi.js';
import { workOrdersApi } from '../../api/workOrdersApi.js';
import { workReportsApi } from '../../api/workReportsApi.js';
import { invoicesApi } from '../../api/invoicesApi.js';

// Un cargador por tipo de origen -- todos devuelven la misma forma de respuesta.
const LOADERS = {
  quote:       (id) => quotesApi.getDocumentFlow(id),
  work_order:  (id) => workOrdersApi.getDocumentFlow(id),
  work_report: (id) => workReportsApi.getDocumentFlow(id),
  invoice:     (id) => invoicesApi.getDocumentFlow(id),
};

// Icono, color, etiqueta y a donde navegar por cada tipo de documento del mapa.
const NODE_TYPES = {
  quote: {
    icon: FileText, label: 'Cotización', color: '#3b82f6',
    path: (id) => `/cotizaciones/${id}/editar`,
  },
  work_order: {
    icon: ClipboardList, label: 'Orden de Trabajo', color: '#f97316',
    path: (id, node) => (node.flow_type === 'post' ? `/post/ordenes/${id}/editar` : `/ordenes/${id}/editar`),
  },
  work_report: {
    icon: Camera, label: 'Reporte de Trabajo', color: '#a855f7',
    path: (id) => `/reportes/${id}/editar`,
  },
  invoice: {
    icon: Receipt, label: 'Factura', color: '#10b981',
    path: (id) => `/facturacion?invoice=${id}`,
  },
};

// Colores de estado por tipo de documento -- mismos textos y colores que usa
// cada pantalla propia (QuotesPage, WorkOrdersPage, WorkReportsPage, InvoicesPage).
const STATUS_LABELS = {
  quote: {
    borrador: { label: 'Borrador', color: '#94a3b8' }, enviada: { label: 'Enviada', color: '#3b82f6' },
    aprobada: { label: 'Aprobada', color: '#10b981' }, rechazada: { label: 'Rechazada', color: '#ef4444' },
    vencida: { label: 'Vencida', color: '#f59e0b' },
  },
  work_order: {
    recibido: { label: 'Recibido', color: '#3b82f6' }, en_proceso: { label: 'En Proceso', color: '#f59e0b' },
    listo: { label: 'Listo', color: '#10b981' }, entregado: { label: 'Entregado', color: '#6366f1' },
    cancelado: { label: 'Cancelado', color: '#ef4444' },
  },
  work_report: {
    en_progreso: { label: 'En Progreso', color: '#f59e0b' }, finalizado: { label: 'Finalizado', color: '#10b981' },
  },
  invoice: {
    pendiente_certificacion: { label: 'Pendiente de Certificar', color: '#f59e0b' },
    certificada: { label: 'Certificada', color: '#10b981' }, anulada: { label: 'Anulada', color: '#ef4444' },
  },
};

// Una tarjeta del mapa: icono + tipo, numero, subtitulo (cliente/equipo) y
// estado. `current` es el documento desde el que se abrio el mapa (no navega, se
// marca "Estás aquí"); `pending` es un paso que todavia no existe (borde
// punteado, sin numero ni clic).
function FlowNode({ type, node, current, pending, onNavigate }) {
  const cfg = NODE_TYPES[type];
  const Icon = cfg.icon;
  const st = !pending && node ? (STATUS_LABELS[type][node.status] || null) : null;
  const clickable = !pending && !current;

  return (
    <div
      onClick={clickable ? () => onNavigate(cfg.path(node.id, node)) : undefined}
      style={{
        minWidth: 190, maxWidth: 220, flex: '0 0 auto',
        background: pending ? 'transparent' : 'var(--c-surface)',
        border: current ? `2px solid ${cfg.color}` : `1px ${pending ? 'dashed' : 'solid'} var(--c-line)`,
        borderRadius: 10, padding: '10px 12px',
        cursor: clickable ? 'pointer' : 'default',
        opacity: pending ? 0.55 : 1,
        transition: 'border-color .15s, transform .1s',
      }}
      onMouseEnter={(e) => { if (clickable) e.currentTarget.style.borderColor = cfg.color; }}
      onMouseLeave={(e) => { if (clickable) e.currentTarget.style.borderColor = 'var(--c-line)'; }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <Icon size={14} color={cfg.color} />
        <span style={{ fontSize: 10, fontWeight: 800, color: cfg.color, textTransform: 'uppercase', letterSpacing: '.4px' }}>
          {cfg.label}
        </span>
        {current && (
          <span title="Estás viendo este documento" style={{ marginLeft: 'auto', display: 'flex' }}>
            <MapPin size={12} color={cfg.color} />
          </span>
        )}
      </div>
      {pending ? (
        <p style={{ margin: 0, fontSize: 12, color: 'var(--c-muted)', fontStyle: 'italic' }}>Todavía no existe</p>
      ) : (
        <>
          <p style={{ margin: '0 0 2px', fontSize: 14, fontWeight: 700, color: 'var(--c-text)' }}>No. {node.number}</p>
          {(node.client_name || node.equipment_name) && (
            <p style={{ margin: '0 0 4px', fontSize: 11, color: 'var(--c-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {node.client_name || node.equipment_name}
            </p>
          )}
          {st && (
            <span style={{ display: 'inline-block', background: st.color + '22', color: st.color, border: '1px solid ' + st.color + '44', borderRadius: 20, padding: '1px 8px', fontSize: 10, fontWeight: 700 }}>
              {st.label}
            </span>
          )}
        </>
      )}
    </div>
  );
}

// Flecha conectora entre dos tarjetas -- horizontal en escritorio, hacia abajo
// en celular (donde la cadena se apila en vertical).
function Connector({ vertical }) {
  const Icon = vertical ? ArrowDown : ArrowRight;
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto', color: 'var(--c-line)' }}>
      <Icon size={16} />
    </div>
  );
}

// Una rama del arbol: Orden -> Reporte -> Factura (o placeholders "pendiente"
// para lo que todavia no existe en esa rama).
function OrderChain({ order, viewing, isMobile, onNavigate }) {
  const dir = isMobile ? 'column' : 'row';
  return (
    <div style={{ display: 'flex', flexDirection: dir, alignItems: isMobile ? 'stretch' : 'center', gap: 10 }}>
      <FlowNode type="work_order" node={order} current={viewing.type === 'work_order' && viewing.id === order.id} onNavigate={onNavigate} />
      <Connector vertical={isMobile} />
      <FlowNode
        type="work_report" node={order.report} pending={!order.report}
        current={viewing.type === 'work_report' && order.report && viewing.id === order.report.id}
        onNavigate={onNavigate}
      />
      <Connector vertical={isMobile} />
      <FlowNode
        type="invoice" node={order.invoice} pending={!order.invoice}
        current={viewing.type === 'invoice' && order.invoice && viewing.id === order.invoice.id}
        onNavigate={onNavigate}
      />
    </div>
  );
}

export default function DocumentFlowModal({ open, onClose, source }) {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [flow, setFlow] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open || !source) return;
    setFlow(null);
    setError('');
    setLoading(true);
    LOADERS[source.type](source.id)
      .then(setFlow)
      .catch((e) => setError(e.response?.data?.error || e.message || 'No se pudo cargar el mapa de relaciones'))
      .finally(() => setLoading(false));
  }, [open, source]);

  const handleNavigate = (path) => {
    onClose?.();
    navigate(path);
  };

  return (
    <Modal open={open} onClose={onClose} title="Mapa de Relaciones" size="xl">
      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
          <Spinner size={28} />
        </div>
      )}
      {!loading && error && (
        <p style={{ color: '#ef4444', textAlign: 'center', padding: '20px 0' }}>{error}</p>
      )}
      {!loading && !error && flow && (
        <div style={{ overflowX: 'auto', paddingBottom: 4 }}>
          <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'stretch' : 'flex-start', gap: 10, minWidth: isMobile ? 'auto' : 640 }}>
            {flow.quote ? (
              <FlowNode
                type="quote" node={flow.quote}
                current={flow.viewing.type === 'quote' && flow.viewing.id === flow.quote.id}
                onNavigate={handleNavigate}
              />
            ) : (
              <FlowNode type="quote" pending onNavigate={handleNavigate} />
            )}
            <Connector vertical={isMobile} />
            {flow.orders.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {flow.orders.map((order) => (
                  <OrderChain key={order.id} order={order} viewing={flow.viewing} isMobile={isMobile} onNavigate={handleNavigate} />
                ))}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'stretch' : 'center', gap: 10 }}>
                <FlowNode type="work_order" pending onNavigate={handleNavigate} />
                <Connector vertical={isMobile} />
                <FlowNode type="work_report" pending onNavigate={handleNavigate} />
                <Connector vertical={isMobile} />
                <FlowNode type="invoice" pending onNavigate={handleNavigate} />
              </div>
            )}
          </div>
          <p style={{ margin: '18px 0 0', fontSize: 11, color: 'var(--c-muted)' }}>
            Haz clic en cualquier documento para abrirlo. Las tarjetas punteadas son pasos que todavía no existen.
          </p>
        </div>
      )}
    </Modal>
  );
}
