// PANTALLA PUBLICA (sin sesion iniciada): la abre el mensajero en su propio
// telefono cuando entrega un equipo terminado en el Centro de Servicios AEG y
// el cliente no esta presente en el taller para firmar en el sistema. Se le
// pasa el telefono al cliente, dibuja su firma y escribe su nombre, y eso
// llena los mismos campos que si un tecnico hubiera capturado la firma
// "Recibido por" dentro del Reporte de Trabajo (ver WorkReportFormPage.jsx,
// boton "Generar enlace para firma remota"). El token largo en la URL es la
// unica proteccion -- no requiere ni pide ninguna cuenta.
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { publicWorkReportsApi } from '../../api/workReportsApi.js';
import { notify } from '../../lib/toast.js';
import SignaturePad from '../../components/reports/SignaturePad.jsx';
import { CheckCircle2 } from 'lucide-react';

const C = { bg:'#f3f6f4', card:'#ffffff', border:'#e2e8e4', text:'#1e293b', muted:'#64748b', orange:'#CA8A04', green:'#164B2C' };

export default function PublicSignaturePage() {
  const { token } = useParams();
  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);
  const [justSigned, setJustSigned] = useState(false);

  useEffect(() => {
    publicWorkReportsApi.get(token)
      .then(setReport)
      .catch(e => setError(e.message || 'Enlace invalido o vencido'));
  }, [token]);

  const handleSave = async (file, name) => {
    try {
      await publicWorkReportsApi.setSignature(token, file, name);
      setJustSigned(true);
    } catch (e) {
      notify.error(e.message || 'No se pudo guardar la firma');
    }
  };

  return (
    <div style={{ minHeight:'100vh', background:C.bg, display:'flex', flexDirection:'column', alignItems:'center', padding:'32px 16px' }}>
      <img src="/logo.png" alt="Taller AEG" style={{ height:64, marginBottom:16 }} />

      <div style={{ width:'100%', maxWidth:420, background:C.card, border:'1px solid '+C.border, borderRadius:12, padding:20, boxShadow:'0 2px 10px rgba(0,0,0,.06)' }}>
        {error ? (
          <div style={{ textAlign:'center', padding:'20px 0' }}>
            <p style={{ color:'#ef4444', fontWeight:700, marginBottom:6 }}>Enlace no válido</p>
            <p style={{ color:C.muted, fontSize:13, margin:0 }}>{error}</p>
          </div>
        ) : !report ? (
          <p style={{ textAlign:'center', color:C.muted }}>Cargando...</p>
        ) : (report.already_signed || justSigned) ? (
          <div style={{ textAlign:'center', padding:'12px 0' }}>
            <CheckCircle2 size={40} color={C.green} style={{ marginBottom:10 }} />
            <p style={{ fontWeight:700, color:C.text, margin:'0 0 4px' }}>¡Gracias! Firma registrada.</p>
            <p style={{ color:C.muted, fontSize:13, margin:'0 0 16px' }}>
              Reporte No. {report.number} — {report.equipment_name || 'equipo'}
            </p>
            {report.client_signature_url && (
              <div style={{ height:100, display:'flex', alignItems:'center', justifyContent:'center', background:'#fff', border:'1px solid '+C.border, borderRadius:8, overflow:'hidden' }}>
                <img src={report.client_signature_url} alt="Firma" style={{ maxHeight:'100%', maxWidth:'100%', objectFit:'contain' }} />
              </div>
            )}
            <p style={{ fontWeight:600, color:C.text, fontSize:13, marginTop:8 }}>{report.client_signature_name}</p>
          </div>
        ) : (
          <div>
            <h1 style={{ fontSize:16, fontWeight:800, color:C.text, margin:'0 0 4px' }}>Firma de recibido</h1>
            <p style={{ fontSize:13, color:C.muted, margin:'0 0 16px' }}>
              Confirma la entrega de tu equipo firmando abajo con el dedo.
            </p>
            <div style={{ background:C.bg, border:'1px solid '+C.border, borderRadius:8, padding:'10px 12px', marginBottom:16, fontSize:13 }}>
              <p style={{ margin:'2px 0' }}><strong>Reporte:</strong> No. {report.number}</p>
              <p style={{ margin:'2px 0' }}><strong>Equipo:</strong> {report.equipment_name || '—'}</p>
              <p style={{ margin:'2px 0' }}><strong>Cliente:</strong> {report.client_name || '—'}</p>
            </div>
            <SignaturePad label="Recibido por" onSave={handleSave} />
          </div>
        )}
      </div>
    </div>
  );
}
