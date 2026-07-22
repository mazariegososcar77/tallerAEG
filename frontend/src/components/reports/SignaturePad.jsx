import { useRef, useState, useEffect } from 'react';
import { Eraser, Check } from 'lucide-react';
import { notify } from '../../lib/toast.js';
import Spinner from '../ui/Spinner.jsx';

const C = { dark:'var(--c-surface-2)', border:'var(--c-line)', text:'var(--c-text)', muted:'var(--c-muted)', orange:'#E8551C' };
const lbl = { display:'block', fontSize:10, fontWeight:800, color:C.muted, textTransform:'uppercase', letterSpacing:'.6px', marginBottom:5 };

/**
 * Captura de firma dibujada a mano (canvas, mouse + touch) + nombre impreso.
 * Si ya hay una firma guardada (`signatureUrl`), la muestra en vez del
 * lienzo, con opcion de "Firmar de nuevo". `onSave(file, name)` recibe un
 * PNG (Blob->File) listo para subir.
 */
export default function SignaturePad({ label, signatureUrl, signatureName, onSave, disabled }) {
  const canvasRef = useRef(null);
  const drawingRef = useRef(false);
  const [hasStroke, setHasStroke] = useState(false);
  const [name, setName] = useState(signatureName || '');
  const [saving, setSaving] = useState(false);
  const [redoing, setRedoing] = useState(false);

  useEffect(() => { setName(signatureName || ''); }, [signatureName]);

  const getPos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const point = e.touches ? e.touches[0] : e;
    return {
      x: (point.clientX - rect.left) * (canvas.width / rect.width),
      y: (point.clientY - rect.top) * (canvas.height / rect.height),
    };
  };

  const start = (e) => {
    if (disabled) return;
    e.preventDefault();
    const ctx = canvasRef.current.getContext('2d');
    const { x, y } = getPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    drawingRef.current = true;
  };
  const move = (e) => {
    if (!drawingRef.current || disabled) return;
    e.preventDefault();
    const ctx = canvasRef.current.getContext('2d');
    const { x, y } = getPos(e);
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasStroke(true);
  };
  const end = () => { drawingRef.current = false; };

  const clear = () => {
    const canvas = canvasRef.current;
    canvas?.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
    setHasStroke(false);
  };

  const handleSave = async () => {
    if (!hasStroke) return notify.error('Dibuja la firma antes de guardar');
    if (!name.trim()) return notify.error('Escribe el nombre de quien firma');
    setSaving(true);
    try {
      const canvas = canvasRef.current;
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
      const file = new File([blob], 'firma.png', { type: 'image/png' });
      await onSave(file, name.trim());
      setRedoing(false);
      clear();
    } catch (e) {
      notify.error(e.message || 'Error al guardar la firma');
    } finally {
      setSaving(false);
    }
  };

  const showCanvas = !signatureUrl || redoing;

  return (
    <div>
      <label style={lbl}>{label}</label>
      {!showCanvas ? (
        <div>
          <div style={{ height:110, display:'flex', alignItems:'center', justifyContent:'center', background:'#fff', border:'1px solid '+C.border, borderRadius:8, overflow:'hidden' }}>
            <img src={signatureUrl} alt={label} style={{ maxHeight:'100%', maxWidth:'100%', objectFit:'contain' }} />
          </div>
          <p style={{ margin:'6px 0 0', fontSize:12, fontWeight:700, color:C.text }}>{signatureName}</p>
          {!disabled && (
            <button type="button" onClick={() => setRedoing(true)}
              style={{ marginTop:4, background:'none', border:'none', color:C.orange, fontSize:11, cursor:'pointer', padding:0, textDecoration:'underline' }}>
              Firmar de nuevo
            </button>
          )}
        </div>
      ) : (
        <div>
          <canvas
            ref={canvasRef}
            width={500}
            height={160}
            style={{ width:'100%', height:130, background:'#fff', border:'1px dashed '+C.border, borderRadius:8, touchAction:'none', cursor:disabled?'default':'crosshair' }}
            onMouseDown={start} onMouseMove={move} onMouseUp={end} onMouseLeave={end}
            onTouchStart={start} onTouchMove={move} onTouchEnd={end}
          />
          <div style={{ display:'flex', gap:8, marginTop:8 }}>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nombre completo"
              disabled={disabled}
              style={{ flex:1, background:C.dark, border:'1px solid '+C.border, color:C.text, padding:'7px 10px', borderRadius:6, fontSize:12, boxSizing:'border-box', outline:'none' }}
            />
            <button type="button" onClick={clear} disabled={disabled}
              title="Borrar y volver a intentar"
              style={{ background:C.dark, border:'1px solid '+C.border, borderRadius:6, padding:'0 10px', cursor:'pointer', color:C.muted }}>
              <Eraser size={15} />
            </button>
            <button type="button" onClick={handleSave} disabled={disabled || saving}
              style={{ background:C.orange, border:'none', color:'#fff', borderRadius:6, padding:'0 14px', cursor:'pointer', fontSize:12, fontWeight:700, display:'flex', alignItems:'center', gap:6, opacity:saving?0.7:1 }}>
              {saving ? <Spinner size={14} /> : <Check size={14} />} Guardar firma
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
