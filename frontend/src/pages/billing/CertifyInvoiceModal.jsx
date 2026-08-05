// ============================================================================
// VENTANA: Certificar Factura
// Se abre desde la pantalla de Facturación al hacer clic en el botón
// "Certificar" de una factura pendiente. Muestra los datos básicos de la
// factura (cliente, orden, total) y pide el correo del cliente para
// "certificarla". OJO: hoy esto solo cambia el estado interno de la factura
// a "certificada" — todavía NO se conecta con la certificación fiscal (FEL)
// real ni se envía un correo automático; eso está pendiente de implementar.
// ============================================================================
import { useState, useEffect } from 'react';
import Modal from '../../components/ui/Modal.jsx';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import { notify } from '../../lib/toast.js';

export default function CertifyInvoiceModal({ open, invoice, onClose, onCertified }) {
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);

  // Cada vez que se abre la ventana con una factura distinta, se rellena el
  // campo de correo con el que el cliente ya tiene registrado (si existe).
  useEffect(() => {
    if (invoice) setEmail(invoice.client_email || invoice.client_default_email || '');
  }, [invoice]);

  if (!invoice) return null;

  // Se ejecuta al presionar el botón "Certificar": valida que haya un
  // correo escrito y luego avisa a la pantalla de Facturación para que
  // marque la factura como certificada.
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
