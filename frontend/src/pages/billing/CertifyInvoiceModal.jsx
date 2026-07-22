import { useState, useEffect } from 'react';
import Modal from '../../components/ui/Modal.jsx';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import { notify } from '../../lib/toast.js';

export default function CertifyInvoiceModal({ open, invoice, onClose, onCertified }) {
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (invoice) setEmail(invoice.client_email || invoice.client_default_email || '');
  }, [invoice]);

  if (!invoice) return null;

  const handleCertify = async () => {
    if (!email.trim()) return notify.error('Ingresa el correo del cliente');
    setSaving(true);
    try {
      await onCertified(invoice.id, email.trim());
      onClose();
    } catch (e) {
      notify.error(e.message || 'Error al certificar la factura');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={saving ? undefined : onClose}
      title={`Certificar Factura No. ${invoice.number}`}
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={handleCertify} loading={saving}>Certificar</Button>
        </>
      }
    >
      <div className="space-y-3 text-sm">
        <div className="rounded-lg border border-line bg-surface2 p-3">
          <p className="font-semibold text-content">{invoice.client_name}</p>
          <p className="text-muted">Orden No. {invoice.work_order_number}</p>
          <p className="mt-1 text-lg font-bold text-orange-500">Q {Number(invoice.total).toFixed(2)}</p>
        </div>
        <Input
          label="Correo del cliente"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="cliente@correo.com"
        />
        <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-700">
          La certificación FEL real y el envío automático del correo aún están pendientes de
          integrar. Esta acción marca la factura como certificada internamente; el PDF se puede
          descargar y enviar manualmente.
        </p>
      </div>
    </Modal>
  );
}
