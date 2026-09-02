// PANTALLA PUBLICA (sin sesion iniciada): la abre alguien en su propio telefono para
// firmar de conformidad cuando no puede hacerlo en el momento dentro de la app —ya sea
// el cliente que recibe un equipo entregado con mensajero (firma en el Reporte de
// Trabajo, ver WorkReportFormPage.jsx) o el cliente de una visita tecnica de campo
// (firma en la Orden de Servicio, ver ServiceOrderFormPage.jsx). Ambos usan el mismo
// boton "Generar enlace para firma remota" y el mismo mecanismo: un token largo en la
// URL es la unica proteccion, no requiere ni pide ninguna cuenta.
//
// Como los dos tipos de documento comparten la misma URL publica (/firmar/:token), esta
// pantalla intenta primero como Reporte de Trabajo y, si el token no existe ahi (404),
// intenta como Orden de Servicio.
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { publicWorkReportsApi } from '../../api/workReportsApi.js';
import { publicServiceOrdersApi } from '../../api/serviceOrdersApi.js';
import { notify } from '../../lib/toast.js';
import SignaturePad from '../../components/reports/SignaturePad.jsx';
import { CheckCircle2 } from 'lucide-react';

const C = { bg:'#f3f6f4', card:'#ffffff', border:'#e2e8e4', text:'#1e293b', muted:'#64748b', orange:'#CA8A04', green:'#164B2C' };

export default function PublicSignaturePage() {
  const { token } = useParams();
  const [doc, setDoc] = useState(null);
  const [kind, setKind] = useState(null); // 'work_report' | 'service_order'
  const [error, setError] = useState(null);
  const [justSigned, setJustSigned] = useState(false);

  useEffect(() => {
    publicWorkReportsApi.get(token)
      .then(r => { setDoc(r); setKind('work_report'); })
      .catch(e => {
        if (e.status !== 404) { setError(e.message || 'Enlace invalido o vencido'); return; }
        publicServiceOrdersApi.get(token)
          .then(r => { setDoc(r); setKind('service_order'); })
          .catch(e2 => setError(e2.message || 'Enlace invalido o vencido'));
      });
  }, [token]);

  const handleSave = async (file, name) => {
    try {
      const api = kind === 'work_report' ? publicWorkReportsApi : publicServiceOrdersApi;
      await api.setSignature(token, file, name);
      setJustSigned(true);
    } catch (e) {
      notify.error(e.message || 'No se pudo guardar la firma');
    }
  };

  const docLabel = kind === 'service_order' ? 'Orden de Servicio' : 'Reporte';

  return (
    <div style={{ minHeight:'100vh', background:C.bg, display:'flex', flexDirection:'column', alignItems:'center', padding:'32px 16px' }}>
      <img src="/logo.png" alt="Centro de Servicio AEG" style={{ height:64, marginBottom:16 }} />

      <div style={{ width:'100%', maxWidth:420, background:C.card, border:'1px solid '+C.border, borderRadius:12, padding:20, boxShadow:'0 2px 10px rgba(0,0,0,.06)' }}>
        {error ? (
          <div style={{ textAlign:'center', padding:'20px 0' }}>
            <p style={{ color:'#ef4444', fontWeight:700, marginBottom:6 }}>Enlace no válido</p>
            <p style={{ color:C.muted, fontSize:13, margin:0 }}>{error}</p>
          </div>
        ) : !doc ? (
          <p style={{ textAlign:'center', color:C.muted }}>Cargando...</p>
        ) : (doc.already_signed || justSigned) ? (
          <div style={{ textAlign:'center', padding:'12px 0' }}>
            <CheckCircle2 size={40} color={C.green} style={{ marginBottom:10 }} />
            <p style={{ fontWeight:700, color:C.text, margin:'0 0 4px' }}>¡Gracias! Firma registrada.</p>
            <p style={{ color:C.muted, fontSize:13, margin:'0 0 16px' }}>
              {docLabel} No. {doc.number} — {doc.equipment_name || 'equipo'}
            </p>
            {doc.client_signature_url && (
              <div style={{ height:100, display:'flex', alignItems:'center', justifyContent:'center', background:'#fff', border:'1px solid '+C.border, borderRadius:8, overflow:'hidden' }}>
                <img src={doc.client_signature_url} alt="Firma" style={{ maxHeight:'100%', maxWidth:'100%', objectFit:'contain' }} />
              </div>
            )}
            <p style={{ fontWeight:600, color:C.text, fontSize:13, marginTop:8 }}>{doc.client_signature_name}</p>
          </div>
        ) : (
          <div>
            <h1 style={{ fontSize:16, fontWeight:800, color:C.text, margin:'0 0 4px' }}>Firma de conformidad</h1>
            <p style={{ fontSize:13, color:C.muted, margin:'0 0 16px' }}>
              Confirma firmando abajo con el dedo.
            </p>
            <div style={{ background:C.bg, border:'1px solid '+C.border, borderRadius:8, padding:'10px 12px', marginBottom:16, fontSize:13 }}>
              <p style={{ margin:'2px 0' }}><strong>{docLabel}:</strong> No. {doc.number}</p>
              <p style={{ margin:'2px 0' }}><strong>Equipo:</strong> {doc.equipment_name || '—'}</p>
              <p style={{ margin:'2px 0' }}><strong>Cliente:</strong> {doc.client_name || '—'}</p>
            </div>
            <SignaturePad label={kind === 'service_order' ? 'F) Cliente' : 'Recibido por'} onSave={handleSave} />
          </div>
        )}
      </div>
    </div>
  );
}
