import { useState, useEffect } from 'react';
import { Download, Wrench, Cpu, ClipboardList, Package } from 'lucide-react';
import { workOrdersApi } from '../../api/workOrdersApi.js';
import Modal from '../../components/ui/Modal.jsx';
import Button from '../../components/ui/Button.jsx';
import Spinner from '../../components/ui/Spinner.jsx';

const STATUS_LABELS = {
  recibido:   { label: 'Recibido',   color: '#3b82f6' },
  en_proceso: { label: 'En Proceso', color: '#f59e0b' },
  listo:      { label: 'Listo',      color: '#10b981' },
  entregado:  { label: 'Entregado',  color: '#6366f1' },
  cancelado:  { label: 'Cancelado',  color: '#ef4444' },
};

function Field({ label, children }) {
  return (
    <div>
      <dt className="text-[10px] font-bold uppercase tracking-wide text-muted">{label}</dt>
      <dd className="mt-0.5 text-sm text-content">{children || '—'}</dd>
    </div>
  );
}

function Section({ icon: Icon, title, children }) {
  return (
    <div className="mt-4 rounded-lg border border-line bg-surface2 p-4">
      <div className="mb-3 flex items-center gap-2">
        <Icon size={16} className="text-orange-500" />
        <span className="text-xs font-bold uppercase tracking-wide text-orange-500">{title}</span>
      </div>
      {children}
    </div>
  );
}

/** Modal de solo lectura con toda la informacion de una orden de trabajo. */
export default function WorkOrderViewModal({ open, onClose, orderId, onDownload }) {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !orderId) return;
    setLoading(true);
    setOrder(null);
    workOrdersApi.get(orderId).then(setOrder).finally(() => setLoading(false));
  }, [open, orderId]);

  const st = order ? (STATUS_LABELS[order.status] || STATUS_LABELS.recibido) : null;
  const includedParts = (order?.items || []).filter(it => it.has_item);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Detalle de la orden"
      size="lg"
      accentColor="#E8551C"
      footer={
        <>
          {order && (
            <Button variant="navy" onClick={() => onDownload?.(order)}>
              <Download size={16} /> Descargar PDF
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>Cerrar</Button>
        </>
      }
    >
      {loading || !order ? (
        <div className="flex items-center justify-center gap-3 py-12 text-muted">
          <Spinner size={20} /> Cargando orden...
        </div>
      ) : (
        <div>
          {/* Cabecera */}
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-lg font-bold text-orange-500">No. {order.number}</span>
            {st && (
              <span
                className="rounded-full border px-2.5 py-0.5 text-xs font-semibold"
                style={{ background: st.color + '22', color: st.color, borderColor: st.color + '44' }}
              >
                {st.label}
              </span>
            )}
            {order.total > 0 && (
              <span className="ml-auto text-lg font-bold text-emerald-500">
                Q {Number(order.total).toFixed(2)}
              </span>
            )}
          </div>

          <Section icon={ClipboardList} title="Informacion general">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
              <Field label="Cliente">{order.client_name}</Field>
              <Field label="Recibido">{order.received_at?.slice(0, 10)}</Field>
              <Field label="Entrega">{order.delivery_at?.slice(0, 10)}</Field>
              <Field label="Autorizado por">{order.authorized_by}</Field>
              <Field label="Proyecto">{order.project}</Field>
              <Field label="No. Cotizacion">{order.quotation_number}</Field>
            </dl>
          </Section>

          <Section icon={Cpu} title="Datos del equipo">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
              <Field label="Equipo">{order.equipment_name}</Field>
              <Field label="Marca">{order.brand}</Field>
              <Field label="Serie / Modelo">{order.serial || order.model}</Field>
              <Field label="KW">{order.kw}</Field>
              <Field label="Voltaje">{order.voltage}</Field>
              <Field label="Amperaje">{order.amperage}</Field>
              <Field label="RPM">{order.rpm}</Field>
              <Field label="HP">{order.hp}</Field>
              <Field label="Frame">{order.frame}</Field>
            </dl>
          </Section>

          <Section icon={Wrench} title="Trabajo a realizar">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
              <Field label="Tipo de trabajo">{order.work_type}</Field>
              <Field label="DTE No.">{order.dte_number}</Field>
              <Field label="O.C. No.">{order.oc_number}</Field>
              <Field label="Tecnico desarma">{order.tech_disarm}</Field>
              <Field label="Tecnico arma">{order.tech_assemble}</Field>
            </dl>
            {order.observations && (
              <div className="mt-3">
                <Field label="Observaciones">{order.observations}</Field>
              </div>
            )}
          </Section>

          {includedParts.length > 0 && (
            <Section icon={Package} title="Partes incluidas">
              <div className="flex flex-wrap gap-2">
                {includedParts.map((it, i) => (
                  <span
                    key={i}
                    className="rounded-md border border-orange-500/40 bg-orange-500/10 px-2.5 py-1 text-xs text-content"
                  >
                    {it.name}
                    {it.quantity > 1 ? ` ×${it.quantity}` : ''}
                  </span>
                ))}
              </div>
            </Section>
          )}
        </div>
      )}
    </Modal>
  );
}
