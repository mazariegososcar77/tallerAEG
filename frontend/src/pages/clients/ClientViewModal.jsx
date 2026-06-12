import { Award } from 'lucide-react';
import Modal from '../../components/ui/Modal.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import LoyaltyTierTag from '../../components/clients/LoyaltyTierTag.jsx';

function Field({ label, children }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted">{label}</dt>
      <dd className="mt-0.5 text-navy-800">{children}</dd>
    </div>
  );
}

/** Modal de solo lectura con toda la informacion del cliente. */
export default function ClientViewModal({ open, onClose, client }) {
  if (!client) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Detalle del cliente"
      size="lg"
      footer={
        <Button variant="outline" onClick={onClose}>
          Cerrar
        </Button>
      }
    >
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h4 className="text-lg font-bold text-navy-800">{client.full_name}</h4>
          {client.client_type_name && <Badge variant="navy">{client.client_type_name}</Badge>}
          {client.is_active ? (
            <Badge variant="success">Activo</Badge>
          ) : (
            <Badge variant="gray">Inactivo</Badge>
          )}
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <Field label="NIT">{client.nit || '—'}</Field>
          <Field label="DPI">{client.dpi || '—'}</Field>
          <Field label="Telefono">{client.phone || '—'}</Field>
          <Field label="Correo">{client.email || '—'}</Field>
          <div className="col-span-2">
            <Field label="Direccion">{client.address || '—'}</Field>
          </div>
        </dl>

        {/* Fidelizacion */}
        <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center gap-2">
            <Award size={18} className="text-orange-500" />
            <span className="text-sm font-semibold text-navy-800">Fidelizacion</span>
          </div>
          {client.loyalty_tier_name ? (
            <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <Field label="Nivel">
                <LoyaltyTierTag
                  name={client.loyalty_tier_name}
                  color={client.loyalty_tier_color}
                  icon={client.loyalty_tier_icon}
                  size={16}
                />
              </Field>
              <Field label="Descuento">
                {client.loyalty_discount != null ? `${Number(client.loyalty_discount).toFixed(0)}%` : '—'}
              </Field>
              <div className="col-span-2">
                <Field label="Beneficios">{client.loyalty_benefits || '—'}</Field>
              </div>
            </dl>
          ) : (
            <p className="mt-2 text-sm text-slate-500">Sin nivel de fidelizacion asignado.</p>
          )}
        </div>
      </div>
    </Modal>
  );
}
