import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { workReportsApi } from '../../api/workReportsApi.js';
import { notify } from '../../lib/toast.js';
import { useAuth } from '../../hooks/useAuth.js';
import PhotoStageGallery from '../../components/reports/PhotoStageGallery.jsx';
import SignaturePad from '../../components/reports/SignaturePad.jsx';

const STAGES = [
  { key: 'antes',          title: 'Antes de Desarmar',                    hint: 'Estado del equipo antes de intervenirlo.' },
  { key: 'desarmado',      title: 'Desarmado + Piezas Nuevas',             hint: 'Equipo desarmado, junto a las piezas nuevas a colocar.' },
  { key: 'piezas_nuevas',  title: 'Piezas Instaladas + Piezas Usadas',     hint: 'Piezas nuevas ya instaladas, junto a las piezas usadas retiradas.' },
  { key: 'armado_final',   title: 'Armado Final',                         hint: 'Equipo armado con las piezas cambiadas y el mantenimiento realizado.' },
];

const C = { bg:'var(--c-app)', card:'var(--c-surface)', dark:'var(--c-surface-2)', border:'var(--c-line)', text:'var(--c-text)', muted:'var(--c-muted)', orange:'#E8551C' };
const sec = { background:C.card, border:'1px solid '+C.border, borderRadius:10, marginBottom:12, overflow:'hidden' };
const secHdr = { background:C.dark, borderBottom:'1px solid '+C.border, padding:'9px 16px' };
const secBody = { padding:'14px 16px' };
const lbl = { display:'block', fontSize:10, fontWeight:800, color:C.muted, textTransform:'uppercase', letterSpacing:'.6px', marginBottom:5 };
const inp = { width:'100%', background:C.dark, border:'1px solid '+C.border, color:C.text, padding:'8px 10px', borderRadius:6, fontSize:12, boxSizing:'border-box', outline:'none', resize:'vertical' };

const SaveIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/>
    <polyline points="17 21 17 13 7 13 7 21"/>
    <polyline points="7 3 7 8 15 8"/>
  </svg>
);

export default function WorkReportFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const [report, setReport] = useState(null);
  const [generalNotes, setGeneralNotes] = useState('');
  const [stageNotes, setStageNotes] = useState({});
  const [saving, setSaving] = useState(false);
  const [finalizing, setFinalizing] = useState(false);

  const load = useCallback(() => {
    workReportsApi.get(id).then(r => {
      setReport(r);
      setGeneralNotes(r.general_notes || '');
      setStageNotes(r.stage_notes || {});
    });
  }, [id]);

  useEffect(() => { load(); }, [load]);

  if (!report) {
    return <p style={{ color: C.muted, textAlign: 'center', marginTop: 40 }}>Cargando...</p>;
  }

  const isFinal = report.status === 'finalizado';
  const canEdit = hasPermission('work-reports.update');
  const canForceEdit = hasPermission('work-reports.force-edit');
  const readOnly = !canEdit || (isFinal && !canForceEdit);
  const photosByStage = (stage) => report.photos.filter(p => p.stage === stage);

  // Espejo de la validacion del backend (workReportService.finalize), pero
  // sobre el estado actual del formulario (incluye notas aun no guardadas)
  // para que el checklist/boton reaccionen sin esperar un "Guardar Notas".
  const missingRequirements = isFinal ? [] : [
    ...STAGES.flatMap(stage => {
      const items = [];
      if (photosByStage(stage.key).length === 0) items.push(`foto de la etapa "${stage.title}"`);
      if (!stageNotes[stage.key]?.trim()) items.push(`nota de la etapa "${stage.title}"`);
      return items;
    }),
    ...(!report.tech_signature_url ? ['firma del técnico que entrega'] : []),
    ...(!report.client_signature_url ? ['firma de quien recibe'] : []),
  ];

  const handleAddPhoto = async (stage, file) => {
    await workReportsApi.addPhoto(id, file, { stage });
    load();
  };
  const handleRemovePhoto = async (photoId) => {
    await workReportsApi.removePhoto(id, photoId);
    load();
  };

  const handleSaveSignature = async (role, file, name) => {
    await workReportsApi.setSignature(id, file, role, name);
    load();
  };

  const handleSaveNotes = async () => {
    setSaving(true);
    try {
      await workReportsApi.update(id, { general_notes: generalNotes, stage_notes: stageNotes });
      notify.success('Notas guardadas');
    } catch (e) {
      notify.error(e.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleFinalize = async () => {
    if (missingRequirements.length > 0) {
      notify.error('Completa los datos obligatorios antes de finalizar');
      return;
    }
    setFinalizing(true);
    try {
      await handleSaveNotes();
      const { invoice } = await workReportsApi.finalize(id);
      notify.success('Reporte finalizado, factura generada');
      navigate(`/facturacion?invoice=${invoice.id}`);
    } catch (e) {
      notify.error(e.message || 'Error al finalizar el reporte');
    } finally {
      setFinalizing(false);
    }
  };

  return (
    <div style={{ background:C.bg, minHeight:'100vh', margin:'-24px', padding:0 }}>
      <div style={{ background:C.card, borderBottom:'1px solid '+C.border, padding:'10px 20px', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:10 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
          <button onClick={() => navigate('/reportes')} style={{ background:C.dark, border:'1px solid '+C.border, color:'#93a8c8', padding:'6px 12px', borderRadius:6, cursor:'pointer', fontSize:12 }}>
            Volver
          </button>
          <span style={{ fontSize:15, fontWeight:700, color:C.text }}>Reporte No. {report.number}</span>
          <span style={{ fontSize:13, color:C.muted }}>Orden No. {report.work_order_number} · {report.client_name}</span>
          <span style={{ background:(isFinal?'#10b981':'#f59e0b')+'22', border:'1px solid '+(isFinal?'#10b981':'#f59e0b')+'44', color:isFinal?'#10b981':'#f59e0b', padding:'3px 10px', borderRadius:4, fontSize:11, fontWeight:700 }}>
            {isFinal ? 'Finalizado' : 'En Progreso'}
          </span>
        </div>
        {!readOnly && (
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={handleSaveNotes} disabled={saving} style={{ background:C.dark, border:'1px solid '+C.border, color:C.text, padding:'8px 16px', borderRadius:6, fontWeight:700, fontSize:13, cursor:'pointer', display:'flex', alignItems:'center', gap:7, opacity:saving?0.7:1 }}>
              <SaveIcon /> {saving ? 'Guardando...' : 'Guardar Notas'}
            </button>
            {!isFinal && (
              <button onClick={handleFinalize} disabled={finalizing || missingRequirements.length > 0}
                title={missingRequirements.length > 0 ? 'Faltan datos obligatorios (ver aviso abajo)' : undefined}
                style={{ background:C.orange, border:'none', color:'#fff', padding:'8px 18px', borderRadius:6, fontWeight:700, fontSize:13, cursor: missingRequirements.length > 0 ? 'not-allowed' : 'pointer', opacity:(finalizing || missingRequirements.length > 0) ? 0.5 : 1 }}>
                {finalizing ? 'Finalizando...' : 'Finalizar Reporte'}
              </button>
            )}
          </div>
        )}
      </div>

      <div style={{ padding:'16px 20px', maxWidth:980, margin:'0 auto' }}>
        {isFinal && canForceEdit && (
          <div style={{ background:'#f59e0b18', border:'1px solid #f59e0b44', borderRadius:8, padding:'10px 14px', marginBottom:12, fontSize:12, color:C.text }}>
            Este reporte ya está <strong>finalizado</strong>. Como administrador puedes editar sus fotos y
            notas, pero la factura ya generada no se vuelve a crear ni a recalcular.
          </div>
        )}
        {!isFinal && !readOnly && missingRequirements.length > 0 && (
          <div style={{ background:'#f59e0b18', border:'1px solid #f59e0b44', borderRadius:8, padding:'10px 14px', marginBottom:12, fontSize:12, color:C.text }}>
            <strong>Faltan datos obligatorios para poder finalizar el reporte:</strong>
            <ul style={{ margin:'6px 0 0', paddingLeft:18 }}>
              {missingRequirements.map((item, i) => <li key={i}>{item}</li>)}
            </ul>
          </div>
        )}
        {STAGES.map(stage => (
          <div key={stage.key} style={sec}>
            <div style={secHdr}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ width:6, height:6, background:C.orange, borderRadius:'50%', display:'inline-block' }}></span>
                <span style={{ fontSize:11, fontWeight:800, color:C.orange, letterSpacing:'1px', textTransform:'uppercase' }}>{stage.title}</span>
              </div>
              <p style={{ margin:'2px 0 0 14px', fontSize:11, color:C.muted }}>{stage.hint}</p>
            </div>
            <div style={secBody}>
              <PhotoStageGallery
                photos={photosByStage(stage.key)}
                onAdd={(file) => handleAddPhoto(stage.key, file)}
                onRemove={handleRemovePhoto}
                disabled={readOnly}
              />
              <div style={{ marginTop:10 }}>
                <label style={lbl}>Nota de la etapa</label>
                <textarea
                  value={stageNotes[stage.key] || ''}
                  onChange={e => setStageNotes(prev => ({ ...prev, [stage.key]: e.target.value }))}
                  rows={2}
                  disabled={readOnly}
                  style={inp}
                />
              </div>
            </div>
          </div>
        ))}

        <div style={sec}>
          <div style={secHdr}>
            <span style={{ fontSize:11, fontWeight:800, color:C.orange, letterSpacing:'1px', textTransform:'uppercase' }}>Notas Generales</span>
          </div>
          <div style={secBody}>
            <textarea
              value={generalNotes}
              onChange={e => setGeneralNotes(e.target.value)}
              rows={3}
              disabled={readOnly}
              style={inp}
              placeholder="Observaciones generales del trabajo realizado..."
            />
          </div>
        </div>

        <div style={sec}>
          <div style={secHdr}>
            <span style={{ fontSize:11, fontWeight:800, color:C.orange, letterSpacing:'1px', textTransform:'uppercase' }}>Firmas</span>
          </div>
          <div style={{ ...secBody, display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
            <SignaturePad
              label="Tecnico que entrega"
              signatureUrl={report.tech_signature_url}
              signatureName={report.tech_signature_name}
              onSave={(file, name) => handleSaveSignature('tech', file, name)}
              disabled={readOnly}
            />
            <SignaturePad
              label="Recibido por"
              signatureUrl={report.client_signature_url}
              signatureName={report.client_signature_name}
              onSave={(file, name) => handleSaveSignature('client', file, name)}
              disabled={readOnly}
            />
          </div>
        </div>
        <div style={{ paddingBottom:32 }} />
      </div>
    </div>
  );
}
