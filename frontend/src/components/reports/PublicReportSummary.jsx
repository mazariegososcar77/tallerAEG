// Reporte completo (fotos + notas por etapa + video) para pantallas PUBLICAS (sin
// sesion): lo usan tanto la firma remota (PublicSignaturePage.jsx) como el enlace
// de solo lectura para compartir con el cliente (PublicReportViewPage.jsx).
import { useState } from 'react';
import ImageViewerModal from '../ui/ImageViewerModal.jsx';

// Mismos esquemas de categorias que WorkReportFormPage.jsx -- aqui solo hace
// falta el titulo (no el minimo de fotos: estas pantallas son de solo lectura).
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

export default function WorkReportSummary({ doc, colors }) {
  const C = colors;
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

// Bloque de una firma (imagen + nombre), de solo lectura. Compartido entre la
// pantalla de firma remota (una vez ya firmado) y el enlace de solo lectura.
export function SignatureBlock({ label, url, name, colors }) {
  const C = colors;
  if (!url && !name) return null;
  return (
    <div style={{ marginBottom: 14 }}>
      <p style={{ fontSize: 12, fontWeight: 700, color: C.orange, textTransform: 'uppercase', letterSpacing: '.4px', margin: '0 0 6px' }}>
        {label}
      </p>
      {url && (
        <div style={{ height: 90, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff', border: '1px solid ' + C.border, borderRadius: 8, overflow: 'hidden', marginBottom: 6 }}>
          <img src={url} alt={label} style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} />
        </div>
      )}
      {name && <p style={{ fontWeight: 600, color: C.text, fontSize: 13, margin: 0 }}>{name}</p>}
    </div>
  );
}
