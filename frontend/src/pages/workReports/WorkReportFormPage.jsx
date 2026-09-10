// PANTALLA: Reporte de Trabajo de una orden. Aquí el técnico documenta con
// fotos y notas cómo fue el trabajo. Hay dos esquemas según cuándo se creó el
// reporte (report.photo_schema_version, ver workReportService.js): los viejos
// (1) siguen mostrando las 4 etapas fijas de siempre; los nuevos (2) muestran
// las 8 categorías reales del manual de Abdías, cada una con un MÍNIMO de
// fotos (sin tope máximo) más un video final de prueba (máx. 30s, se
// comprime en el servidor). En ambos esquemas, cada categoría necesita
// también su nota. Al final se capturan dos firmas (quien entrega el equipo y
// quien lo recibe) dibujándolas con el dedo o el mouse. El reporte no nace
// vacío: se crea automáticamente al presionar el botón de cámara en la orden
// de trabajo correspondiente.
//
// El botón "Finalizar Reporte" NO se puede usar si falta algo (foto, nota o
// firma) — se deshabilita y se muestra abajo la lista de lo que falta. Esto es
// a propósito: un reporte incompleto no debe poder cerrarse. Al finalizar, el
// sistema genera automáticamente la factura correspondiente y lleva a la
// pantalla de Facturación. Una vez finalizado, el reporte queda de solo
// lectura para todos, salvo un administrador con permiso especial, que puede
// seguir editando fotos y notas (pero ya no se genera otra factura).
import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { workReportsApi } from '../../api/workReportsApi.js';
import { notify } from '../../lib/toast.js';
import { useAuth } from '../../hooks/useAuth.js';
import { useIsMobile } from '../../hooks/useIsMobile.js';
import PhotoStageGallery from '../../components/reports/PhotoStageGallery.jsx';
import VideoField from '../../components/reports/VideoField.jsx';
import SignaturePad from '../../components/reports/SignaturePad.jsx';
import WorkOrderDocumentsModal from '../../components/workOrders/WorkOrderDocumentsModal.jsx';

// Esquema viejo (photo_schema_version=1): las 4 etapas fijas con las que
// nacio este modulo. Un reporte que ya existia al desplegar las categorias
// nuevas se queda para siempre en este esquema (ver workReportService.js) --
// por eso conviven ambas listas y nunca se tocan las fotos/notas viejas.
// `min` queda sin definir a proposito: PhotoStageGallery solo muestra el
// indicador de minimo cuando se le pasa un numero.
const STAGES = [
  { key: 'antes',          title: 'Antes de Desarmar',                    hint: 'Estado del equipo antes de intervenirlo.' },
  { key: 'desarmado',      title: 'Desarmado + Piezas Nuevas',             hint: 'Equipo desarmado, junto a las piezas nuevas a colocar.' },
  { key: 'piezas_nuevas',  title: 'Piezas Instaladas + Piezas Usadas',     hint: 'Piezas nuevas ya instaladas, junto a las piezas usadas retiradas.' },
  { key: 'armado_final',   title: 'Armado Final',                         hint: 'Equipo armado con las piezas cambiadas y el mantenimiento realizado.' },
];

// Esquema nuevo (photo_schema_version=2): las 8 categorias reales del manual
// de Abdias. `min` es el MINIMO de fotos exigido -- nunca un tope maximo, el
// tecnico puede subir mas. Mismas llaves/minimos que
// workReportService.PHOTO_CATEGORIES (backend) -- si se cambia uno hay que
// cambiar el otro.
const PHOTO_CATEGORIES = [
  { key: 'ingreso',            title: 'Ingreso de Equipo',                  hint: 'Condiciones físicas, accesorios y posición en que llegó el equipo.', min: 1 },
  { key: 'placa_datos',        title: 'Placa de Datos',                     hint: 'Placa con los datos técnicos del equipo, legible.', min: 1 },
  { key: 'mediciones_ingreso', title: 'Mediciones Eléctricas de Ingreso',   hint: 'Megaohms, ohms y amperaje, tomados al recibir el equipo.', min: 3 },
  { key: 'desarme',            title: 'Proceso de Desarme',                 hint: 'Estator, rotor, tapaderas y accesorios durante el desarme.', min: 4 },
  { key: 'mantenimiento',      title: 'Mantenimiento o Rebobinado',         hint: 'Estator empapelado/rebobinado, barniz rojo, eje, cojinetes nuevos, tapaderas, trabajos de torno y repuestos.', min: 7 },
  { key: 'repuestos',          title: 'Repuestos',                          hint: 'Repuestos nuevos empaquetados y ya instalados.', min: 2 },
  { key: 'armado',             title: 'Equipo Armado',                      hint: 'Equipo ya armado, listo para entregar.', min: 1 },
  { key: 'mediciones_finales', title: 'Mediciones Eléctricas Finales',      hint: 'Mediciones eléctricas tomadas al terminar el trabajo.', min: 1 },
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
  const isMobile = useIsMobile();
  const [report, setReport] = useState(null);
  const [generalNotes, setGeneralNotes] = useState('');
  const [stageNotes, setStageNotes] = useState({});
  const [saving, setSaving] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [docsStep, setDocsStep] = useState(false); // paso de documentos abierto antes de finalizar
  const [signingLink, setSigningLink] = useState(null);
  const [loadingLink, setLoadingLink] = useState(false);

  // Trae el reporte completo del servidor (datos, fotos, notas y firmas) y lo
  // pone en pantalla. Se llama de nuevo cada vez que se agrega una foto, se
  // borra, o se guarda una firma, para que la pantalla siempre muestre lo ultimo.
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
  const isLegacy = report.photo_schema_version === 1;
  const categories = isLegacy ? STAGES : PHOTO_CATEGORIES;
  const photosByStage = (stage) => report.photos.filter(p => p.stage === stage);

  // Espejo de la validacion del backend (workReportService.getMissingRequirements),
  // pero sobre el estado actual del formulario (incluye notas aun no guardadas)
  // para que el checklist/boton reaccionen sin esperar un "Guardar Notas".
  // Se ramifica igual que el backend: esquema viejo exige exactamente 1 foto
  // por etapa, el nuevo exige el MINIMO de cada categoria (nunca un tope) +
  // el video final.
  const missingRequirements = isFinal ? [] : [
    ...categories.flatMap(cat => {
      const items = [];
      const count = photosByStage(cat.key).length;
      const min = cat.min || 1;
      if (count < min) {
        items.push(isLegacy ? `foto de la etapa "${cat.title}"` : `fotos de "${cat.title}" (tiene ${count}, mínimo ${min})`);
      }
      if (!stageNotes[cat.key]?.trim()) items.push(`nota de "${cat.title}"`);
      return items;
    }),
    ...(!isLegacy && !report.final_video_url ? ['video de prueba final (máximo 30 segundos)'] : []),
    ...(!report.tech_signature_url ? ['firma del técnico que entrega'] : []),
    ...(!report.client_signature_url ? ['firma de quien recibe'] : []),
  ];

  // Sube una foto a la etapa indicada. Actualiza SOLO la lista de fotos en el
  // estado local (no vuelve a pedir el reporte completo con load()): las notas
  // por etapa son responsabilidad de "Guardar Notas", no de esto. Un load() aca
  // pisaria con lo ultimo guardado en la base cualquier nota que el tecnico ya
  // haya escrito en pantalla pero todavia no haya guardado, en las 4 etapas (no
  // solo en la de la foto nueva) -- ese fue el bug.
  const handleAddPhoto = async (stage, file, onProgress) => {
    const photo = await workReportsApi.addPhoto(id, file, { stage, onProgress });
    setReport(prev => ({ ...prev, photos: [...prev.photos, photo] }));
  };
  // Quita una foto ya subida. Mismo criterio que handleAddPhoto: solo toca
  // report.photos en el estado local, nunca stageNotes/generalNotes.
  const handleRemovePhoto = async (photoId) => {
    await workReportsApi.removePhoto(id, photoId);
    setReport(prev => ({ ...prev, photos: prev.photos.filter(p => p.id !== photoId) }));
  };

  // Sube (o reemplaza) el video final de prueba. Mismo criterio que
  // handleAddPhoto: el servidor devuelve el reporte completo, pero aca solo
  // se mergean los 3 campos del video al estado local -- nunca se pisa
  // stageNotes/generalNotes con lo ultimo guardado en la base.
  const handleUploadVideo = async (file) => {
    const updated = await workReportsApi.uploadVideo(id, file);
    setReport(prev => ({
      ...prev,
      final_video_url: updated.final_video_url,
      final_video_duration_seconds: updated.final_video_duration_seconds,
      final_video_size_bytes: updated.final_video_size_bytes,
    }));
  };
  const handleRemoveVideo = async () => {
    const updated = await workReportsApi.removeVideo(id);
    setReport(prev => ({
      ...prev,
      final_video_url: updated.final_video_url,
      final_video_duration_seconds: updated.final_video_duration_seconds,
      final_video_size_bytes: updated.final_video_size_bytes,
    }));
  };

  // Guarda la firma dibujada (del tecnico o de quien recibe) junto con el nombre de quien firma.
  // Primero guarda las notas pendientes: firmar dispara un load() que trae el reporte
  // del servidor y pisa el estado local de generalNotes/stageNotes, así que si hubiera
  // notas escritas sin guardar se perderían de la pantalla (aunque nunca se guardaron,
  // parecía que la firma las "borraba"). Mismo patrón que handleFinalize.
  const handleSaveSignature = async (role, file, name) => {
    await handleSaveNotes();
    await workReportsApi.setSignature(id, file, role, name);
    load();
  };

  // Genera (o recupera) el enlace publico para que el cliente firme "Recibido"
  // desde su propio telefono cuando el equipo se manda con mensajero (sin
  // sesion iniciada, ver PublicSignaturePage.jsx). Pedirlo varias veces no
  // invalida el link ya enviado -- siempre es el mismo token.
  const handleGenerateLink = async () => {
    setLoadingLink(true);
    try {
      const { token } = await workReportsApi.getSigningLink(id);
      setSigningLink(`${window.location.origin}/firmar/${token}`);
    } catch (e) {
      notify.error(e.message || 'No se pudo generar el enlace');
    } finally {
      setLoadingLink(false);
    }
  };

  // Guarda las notas (generales y de cada etapa) sin finalizar el reporte todavia.
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

  // Finaliza el reporte: primero guarda las notas pendientes, luego le pide al
  // servidor que lo cierre. No deja finalizar si falta alguna foto, nota o firma
  // (ver "missingRequirements" arriba).
  //
  // Que pasa despues depende de que documenta el reporte (lo decide el servidor,
  // ver workReportService.finalize):
  // - Orden de Trabajo, Pre: ya genera la factura automatico, se navega a
  //   Facturacion para certificarla.
  // - Orden de Trabajo, Post: todavia no hay cotizacion (se arma DESPUES del
  //   reporte, con el diagnostico ya conocido), el servidor devuelve
  //   invoice: null y aqui se lleva al usuario a crear esa cotizacion,
  //   prellenada con los estimados que se capturaron al abrir la orden.
  // - Orden de Servicio (subcontrato): nunca factura (costo interno, no se le
  //   cobra a un cliente) -- se queda en el reporte, ya finalizado y de solo
  //   lectura.
  // Paso obligatorio previo: si el reporte documenta una Orden de Trabajo que
  // todavia no paso por la revision de documentos de terceros, primero se abre esa
  // ventana. El backend rechaza el finalize sin esa marca (409), asi que esto no es
  // solo cortesia: es el camino para cumplirla sin salir de aqui.
  //
  // Los reportes de Orden de Servicio no entran: nunca generan factura.
  const handleFinalizeClick = () => {
    if (missingRequirements.length > 0) {
      notify.error('Completa los datos obligatorios antes de finalizar');
      return;
    }
    if (report?.work_order_id && !report.documents_reviewed_at) {
      setDocsStep(true);
      return;
    }
    handleFinalize();
  };

  // Al confirmar la revision, se cierra el paso y sigue el finalize normal.
  const handleDocsConfirmed = () => {
    setDocsStep(false);
    handleFinalize();
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
      if (invoice) {
        notify.success('Reporte finalizado, factura generada');
        navigate(`/facturacion?invoice=${invoice.id}`);
      } else if (report.work_order_id) {
        notify.success('Reporte finalizado. Arma la cotizacion con el diagnostico ya conocido.');
        navigate(`/post/cotizaciones/nueva?fromWorkOrder=${report.work_order_id}`);
      } else {
        notify.success('Reporte finalizado.');
        load();
      }
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
              <button onClick={handleFinalizeClick} disabled={finalizing || missingRequirements.length > 0}
                title={missingRequirements.length > 0 ? 'Faltan datos obligatorios (ver aviso abajo)' : undefined}
                style={{ background:C.orange, border:'none', color:'#fff', padding:'8px 18px', borderRadius:6, fontWeight:700, fontSize:13, cursor: missingRequirements.length > 0 ? 'not-allowed' : 'pointer', opacity:(finalizing || missingRequirements.length > 0) ? 0.5 : 1 }}>
                {finalizing ? 'Finalizando...' : 'Finalizar Reporte'}
              </button>
            )}
          </div>
        )}
      </div>

      <div style={{ padding:'16px 20px', maxWidth:980, margin:'0 auto' }}>
        {/* Aviso cuando un administrador esta editando un reporte ya finalizado */}
        {isFinal && canForceEdit && (
          <div style={{ background:'#f59e0b18', border:'1px solid #f59e0b44', borderRadius:8, padding:'10px 14px', marginBottom:12, fontSize:12, color:C.text }}>
            Este reporte ya está <strong>finalizado</strong>. Como administrador puedes editar sus fotos y
            notas, pero la factura ya generada no se vuelve a crear ni a recalcular.
          </div>
        )}
        {/* Lista de lo que falta para poder finalizar (fotos, notas o firmas pendientes) */}
        {!isFinal && !readOnly && missingRequirements.length > 0 && (
          <div style={{ background:'#f59e0b18', border:'1px solid #f59e0b44', borderRadius:8, padding:'10px 14px', marginBottom:12, fontSize:12, color:C.text }}>
            <strong>Faltan datos obligatorios para poder finalizar el reporte:</strong>
            <ul style={{ margin:'6px 0 0', paddingLeft:18 }}>
              {missingRequirements.map((item, i) => <li key={i}>{item}</li>)}
            </ul>
          </div>
        )}
        {/* Un bloque por cada etapa/categoria (las 4 de siempre o las 8 nuevas,
            segun report.photo_schema_version), con sus fotos y su nota */}
        {categories.map(cat => (
          <div key={cat.key} style={sec}>
            <div style={secHdr}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ width:6, height:6, background:C.orange, borderRadius:'50%', display:'inline-block' }}></span>
                <span style={{ fontSize:11, fontWeight:800, color:C.orange, letterSpacing:'1px', textTransform:'uppercase' }}>{cat.title}</span>
                {!isLegacy && <span style={{ fontSize:10, color:C.muted, fontWeight:600 }}>(mínimo {cat.min} foto{cat.min===1?'':'s'})</span>}
              </div>
              <p style={{ margin:'2px 0 0 14px', fontSize:11, color:C.muted }}>{cat.hint}</p>
            </div>
            <div style={secBody}>
              <PhotoStageGallery
                photos={photosByStage(cat.key)}
                onAdd={(file, onProgress) => handleAddPhoto(cat.key, file, onProgress)}
                onRemove={handleRemovePhoto}
                disabled={readOnly}
                min={isLegacy ? undefined : cat.min}
              />
              <div style={{ marginTop:10 }}>
                <label style={lbl}>Nota de la etapa</label>
                <textarea
                  value={stageNotes[cat.key] || ''}
                  onChange={e => setStageNotes(prev => ({ ...prev, [cat.key]: e.target.value }))}
                  rows={2}
                  disabled={readOnly}
                  style={inp}
                />
              </div>
            </div>
          </div>
        ))}

        {/* Video final de prueba: solo en el esquema nuevo (las 8 categorias). */}
        {!isLegacy && (
          <div style={sec}>
            <div style={secHdr}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ width:6, height:6, background:C.orange, borderRadius:'50%', display:'inline-block' }}></span>
                <span style={{ fontSize:11, fontWeight:800, color:C.orange, letterSpacing:'1px', textTransform:'uppercase' }}>Video de Prueba Final</span>
                <span style={{ fontSize:10, color:C.muted, fontWeight:600 }}>(máx. 30 segundos)</span>
              </div>
              <p style={{ margin:'2px 0 0 14px', fontSize:11, color:C.muted }}>Equipo funcionando ya armado, como constancia final.</p>
            </div>
            <div style={secBody}>
              <VideoField
                videoUrl={report.final_video_url}
                durationSeconds={report.final_video_duration_seconds}
                sizeBytes={report.final_video_size_bytes}
                disabled={readOnly}
                onUpload={handleUploadVideo}
                onRemove={handleRemoveVideo}
              />
            </div>
          </div>
        )}

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
          {/* Firma de quien entrega el equipo (tecnico) y de quien lo recibe (cliente),
              dibujadas a mano en la pantalla */}
          <div style={{ ...secBody, display:'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap:20 }}>
            <SignaturePad
              label="Tecnico que entrega"
              signatureUrl={report.tech_signature_url}
              signatureName={report.tech_signature_name}
              onSave={(file, name) => handleSaveSignature('tech', file, name)}
              disabled={readOnly}
            />
            <div>
              <SignaturePad
                label="Recibido por"
                signatureUrl={report.client_signature_url}
                signatureName={report.client_signature_name}
                onSave={(file, name) => handleSaveSignature('client', file, name)}
                disabled={readOnly}
              />
              {/* Enlace publico de firma remota: para cuando el equipo se manda con
                  mensajero y el cliente firma "Recibido" desde su propio telefono,
                  sin iniciar sesion (ver PublicSignaturePage.jsx). */}
              {!readOnly && !report.client_signature_url && (
                <div style={{ marginTop: 10 }}>
                  {!signingLink ? (
                    <button type="button" onClick={handleGenerateLink} disabled={loadingLink}
                      style={{ background: C.dark, border: '1px solid ' + C.border, color: C.orange, padding: '7px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 700, opacity: loadingLink ? 0.7 : 1 }}>
                      {loadingLink ? 'Generando...' : 'Generar enlace para firma remota (mensajero)'}
                    </button>
                  ) : (
                    <div style={{ background: C.dark, border: '1px solid ' + C.border, borderRadius: 8, padding: '10px 12px' }}>
                      <p style={{ margin: '0 0 6px', fontSize: 11, color: C.muted }}>
                        Comparte este enlace con el mensajero: el cliente lo abre en su celular, firma y escribe su nombre — sin necesitar cuenta en el sistema.
                      </p>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <input readOnly value={signingLink} onFocus={e => e.target.select()}
                          style={{ ...inp, flex: 1, minWidth: 180, fontSize: 11 }} />
                        <button type="button" onClick={() => { navigator.clipboard.writeText(signingLink); notify.success('Enlace copiado'); }}
                          style={{ background: C.card, border: '1px solid ' + C.border, color: C.text, padding: '0 12px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                          Copiar
                        </button>
                        <a href={`https://wa.me/?text=${encodeURIComponent('Por favor firma de recibido aquí: ' + signingLink)}`} target="_blank" rel="noreferrer"
                          style={{ background: '#25D366', border: 'none', color: '#fff', padding: '0 12px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
                          Enviar por WhatsApp
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        <div style={{ paddingBottom:32 }} />
      </div>

      {/* Paso obligatorio antes de facturar: revisar los documentos de terceros de
          la orden. Aparece al presionar "Finalizar Reporte" si esa orden todavia no
          paso por ahi; al confirmar, el finalize sigue solo. */}
      <WorkOrderDocumentsModal
        open={docsStep}
        order={{
          id: report.work_order_id,
          number: report.order_number,
          documents_reviewed_at: report.documents_reviewed_at,
        }}
        stepMode
        onClose={() => setDocsStep(false)}
        onConfirmed={handleDocsConfirmed}
      />
    </div>
  );
}
