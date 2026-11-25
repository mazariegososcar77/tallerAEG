// PANTALLA PUBLICA (sin sesion iniciada) DE SOLO LECTURA: el enlace que se le
// comparte al cliente desde la lista de Reportes de Trabajo para que vea el
// reporte completo (fotos, videos, notas y firmas) desde su propio telefono.
// A diferencia de /firmar/:token (PublicSignaturePage.jsx), aqui no hay nada
// que firmar ni que editar -- el token de este enlace ni siquiera sirve para
// eso, no existe ningun endpoint publico que lo acepte para escribir algo.
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { publicWorkReportsApi } from '../../api/workReportsApi.js';
import WorkReportSummary, { SignatureBlock } from '../../components/reports/PublicReportSummary.jsx';

const C = { bg:'#f3f6f4', card:'#ffffff', border:'#e2e8e4', text:'#1e293b', muted:'#64748b', orange:'#CA8A04', green:'#164B2C' };

export default function PublicReportViewPage() {
  const { token } = useParams();
  const [doc, setDoc] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    publicWorkReportsApi.getByShareToken(token)
      .then(setDoc)
      .catch(e => setError(e.message || 'Enlace invalido o vencido'));
  }, [token]);

  return (
    <div className="min-h-app" style={{ background:C.bg, display:'flex', flexDirection:'column', alignItems:'center', padding:'32px 16px' }}>
      <img src="/logo.png" alt="Centro de Servicio AEG" style={{ height:64, marginBottom:16 }} />

      <div style={{ width:'100%', maxWidth:480, background:C.card, border:'1px solid '+C.border, borderRadius:12, padding:20, boxShadow:'0 2px 10px rgba(0,0,0,.06)' }}>
        {error ? (
          <div style={{ textAlign:'center', padding:'20px 0' }}>
            <p style={{ color:'#ef4444', fontWeight:700, marginBottom:6 }}>Enlace no válido</p>
            <p style={{ color:C.muted, fontSize:13, margin:0 }}>{error}</p>
          </div>
        ) : !doc ? (
          <p style={{ textAlign:'center', color:C.muted }}>Cargando...</p>
        ) : (
          <div>
            <h1 style={{ fontSize:16, fontWeight:800, color:C.text, margin:'0 0 4px' }}>Reporte de trabajo</h1>
            <p style={{ fontSize:13, color:C.muted, margin:'0 0 16px' }}>
              Solo para ver — este enlace no permite hacer cambios.
            </p>
            <div style={{ background:C.bg, border:'1px solid '+C.border, borderRadius:8, padding:'10px 12px', marginBottom:16, fontSize:13 }}>
              <p style={{ margin:'2px 0' }}><strong>Reporte:</strong> No. {doc.number}</p>
              <p style={{ margin:'2px 0' }}><strong>Orden:</strong> No. {doc.order_number || '—'}</p>
              <p style={{ margin:'2px 0' }}><strong>Equipo:</strong> {doc.equipment_name || '—'}</p>
              <p style={{ margin:'2px 0' }}><strong>Cliente:</strong> {doc.client_name || '—'}</p>
            </div>

            <WorkReportSummary doc={doc} colors={C} />

            {(doc.tech_signature_url || doc.client_signature_url) && (
              <div style={{ marginTop:4, paddingTop:12, borderTop:'1px solid '+C.border }}>
                <SignatureBlock label="Tecnico que entrega" url={doc.tech_signature_url} name={doc.tech_signature_name} colors={C} />
                <SignatureBlock label="Recibido por" url={doc.client_signature_url} name={doc.client_signature_name} colors={C} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
