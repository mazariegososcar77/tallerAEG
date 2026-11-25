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
import ImageViewerModal from '../../components/ui/ImageViewerModal.jsx';
import { CheckCircle2 } from 'lucide-react';

const C = { bg:'#f3f6f4', card:'#ffffff', border:'#e2e8e4', text:'#1e293b', muted:'#64748b', orange:'#CA8A04', green:'#164B2C' };

// Mismos esquemas de categorias que WorkReportFormPage.jsx -- aqui solo hace
// falta el titulo (no el minimo de fotos: esta pantalla es de solo lectura).
const STAGE_TITLES_V1 = {
  antes: 'Antes de Desarmar',
  desarmado: 'Desarmado + Piezas Nuevas',
  piezas_nuevas: 'Piezas Instaladas + Piezas Usadas',
  armado_final: 'Armado Final',
};
const STAGE_TITLES_V2 = {
  ingreso: 'Ingreso de Equipo',
  placa_datos: 'Placa de Datos',
  mediciones_ingreso: 'Mediciones Eléctricas de Ingreso',
  desarme: 'Proceso de Desarme',
  mantenimiento: 'Mantenimiento o Rebobinado',
  repuestos: 'Repuestos',
  armado: 'Equipo Armado',
  mediciones_finales: 'Mediciones Eléctricas Finales',
};

// Reporte completo (fotos + notas por etapa + video) para que quien firma a
// distancia -- un mensajero que entrega el equipo, sin estar en el taller --
// pueda revisar el trabajo antes de firmar, no solo el numero y el equipo.
function WorkReportSummary({ doc }) {
  const [viewer, setViewer] = useState(null); // { images, index } | null
  const titles = doc.photo_schema_version === 1 ? STAGE_TITLES_V1 : STAGE_TITLES_V2;
  const stages = Object.keys(titles).filter(key =>
    (doc.photos || []).some(p => p.stage === key) || doc.stage_notes?.[key] || (doc.category_videos || []).some(v => v.stage === key)
  );
  if (!stages.length && !doc.general_notes && !doc.final_video_url) return null;

  return (
    <div style={{ marginBottom: 16 }}>
      <h2 style={{ fontSize: 14, fontWeight: 800, color: C.text, margin: '0 0 10px' }}>Reporte de trabajo</h2>
      {doc.general_notes && (
        <p style={{ fontSize: 13, color: C.text, background: C.bg, border: '1px solid ' + C.border, borderRadius: 8, padding: '8px 10px', margin: '0 0 10px' }}>
          {doc.general_notes}
        </p>
      )}
      {stages.map(key => {
        const photos = (doc.photos || []).filter(p => p.stage === key);
        const note = doc.stage_notes?.[key];
        const categoryVideo = (doc.category_videos || []).find(v => v.stage === key);
        const images = photos.map(p => ({ url: p.photo_url, caption: p.caption }));
        return (
          <div key={key} style={{ marginBottom: 12 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: C.orange, textTransform: 'uppercase', letterSpacing: '.4px', margin: '0 0 6px' }}>
              {titles[key]}
            </p>
            {note && <p style={{ fontSize: 13, color: C.text, margin: '0 0 6px' }}>{note}</p>}
            {photos.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {photos.map((p, i) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setViewer({ images, index: i })}
                    style={{ width: 72, height: 72, borderRadius: 8, overflow: 'hidden', border: '1px solid ' + C.border, padding: 0, cursor: 'pointer', background: C.bg }}
                  >
                    <img src={p.photo_url} alt={p.caption || titles[key]} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </button>
                ))}
              </div>
            )}
            {categoryVideo && (
              <video src={categoryVideo.video_url} controls style={{ width: '100%', maxWidth: 240, borderRadius: 8, background: '#000', marginTop: 6 }} />
            )}
          </div>
        );
      })}
      {doc.final_video_url && (
        <div style={{ marginBottom: 4 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: C.orange, textTransform: 'uppercase', letterSpacing: '.4px', margin: '0 0 6px' }}>
            Video de prueba final
          </p>
          <video src={doc.final_video_url} controls style={{ width: '100%', maxWidth: 280, borderRadius: 8, background: '#000' }} />
        </div>
      )}
      <ImageViewerModal
        open={viewer != null}
        onClose={() => setViewer(null)}
        images={viewer?.images || []}
        index={viewer?.index || 0}
        onIndexChange={(i) => setViewer(v => ({ ...v, index: i }))}
      />
    </div>
  );
}

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
    <div className="min-h-app" style={{ background:C.bg, display:'flex', flexDirection:'column', alignItems:'center', padding:'32px 16px' }}>
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
            {kind === 'work_report' && (
              <div style={{ textAlign:'left', marginTop:20, paddingTop:16, borderTop:'1px solid '+C.border }}>
                <WorkReportSummary doc={doc} />
              </div>
            )}
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
            {kind === 'work_report' && <WorkReportSummary doc={doc} />}
            <SignaturePad label={kind === 'service_order' ? 'F) Cliente' : 'Recibido por'} onSave={handleSave} />
          </div>
        )}
      </div>
    </div>
  );
}
