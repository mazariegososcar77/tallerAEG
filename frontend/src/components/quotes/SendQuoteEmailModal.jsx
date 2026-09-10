// Ventana para mandarle la cotización al cliente por correo, con el PDF adjunto.
//
// Por qué se pide el correo cada vez en vez de usar sin más el de la ficha del
// cliente: en la práctica la cotización casi nunca la recibe el contacto
// registrado, sino alguien de compras o quien pidió el trabajo. Por eso el
// correo del cliente viene *propuesto* pero se puede cambiar, y si el cliente
// no tiene correo guardado el campo simplemente arranca vacío.
//
// El envío en sí lo hace n8n (el backend le pasa el PDF ya armado). Si n8n no
// responde, el error se muestra aquí: el usuario apretó un botón y necesita
// saber si salió o no.
import { useEffect, useState } from 'react';
import { Mail, Send } from 'lucide-react';
import { quotesApi } from '../../api/quotesApi.js';
import { notify } from '../../lib/toast.js';
import Modal from '../ui/Modal.jsx';
import Input from '../ui/Input.jsx';
import Textarea from '../ui/Textarea.jsx';
import Button from '../ui/Button.jsx';

export default function SendQuoteEmailModal({ quote, onClose, onSent }) {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  // Al abrirse con una cotización, propone el correo del cliente.
  useEffect(() => {
    setEmail(quote?.client_email || '');
    setMessage('');
  }, [quote]);

  const handleSend = async () => {
    const destino = email.trim();
    if (!destino) return notify.error('Escribe el correo al que se va a enviar');
    setSending(true);
    try {
      await quotesApi.sendEmail(quote.id, destino, message.trim() || undefined);
      notify.success(`Cotización No. ${quote.number} enviada a ${destino}`);
      onSent?.();
      onClose();
    } catch (e) {
      notify.error(e.response?.data?.error || 'No se pudo enviar la cotización');
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal
      open={!!quote}
      onClose={onClose}
      title={quote ? `Enviar cotización No. ${quote.number}` : ''}
      accentColor="#CA8A04"
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={sending}>Cancelar</Button>
          <Button variant="primary" onClick={handleSend} loading={sending}>
            <Send size={16} /> Enviar
          </Button>
        </div>
      }
    >
      <div className="flex items-start gap-3 rounded-lg border border-line bg-surface2 p-3">
        <Mail size={18} className="mt-0.5 shrink-0 text-orange-500" />
        <p className="text-xs text-muted">
          Se enviará el PDF de la cotización adjunto a un correo. Si el cliente pidió que la
          recibiera otra persona (compras, contabilidad), cambia la dirección aquí.
        </p>
      </div>

      <div className="mt-4 grid gap-4">
        <Input
          label="Enviar a"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          noUppercase
          placeholder="cliente@empresa.com"
          autoFocus
        />
        {!quote?.client_email && (
          <p className="-mt-2 text-[11px] text-muted">
            Este cliente no tiene correo guardado en su ficha, así que hay que escribirlo.
          </p>
        )}
        <Textarea
          label="Mensaje (opcional)"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          maxLength={500}
          noUppercase
          placeholder="Estimado cliente, adjunto la cotización solicitada..."
        />
      </div>
    </Modal>
  );
}
