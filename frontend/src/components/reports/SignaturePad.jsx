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
 *
 * Este es el recuadro donde una persona firma a mano (con el mouse en
 * computadora, o con el dedo en una tablet/celular) al final del Reporte de
 * Trabajo — se usa dos veces: para la firma del "Tecnico que entrega" y para
 * la de "Recibido por" (el cliente). No usa ninguna libreria externa para
 * dibujar: usa directamente un <canvas>, que es como un lienzo en blanco
 * donde se puede pintar con codigo.
 *
 * Props:
 * - label: el titulo de la firma (ej. "Tecnico que entrega").
 * - signatureUrl / signatureName: si ya existe una firma guardada, su imagen
 *   y el nombre de quien firmo (en ese caso se muestra la imagen en vez del
 *   lienzo para dibujar).
 * - onSave(file, name): que hacer cuando se guarda una firma nueva; recibe la
 *   imagen de la firma (ya convertida a archivo PNG) y el nombre escrito.
 * - disabled: bloquea firmar/borrar (ej. reporte ya finalizado).
 */
export default function SignaturePad({ label, signatureUrl, signatureName, onSave, disabled }) {
  const canvasRef = useRef(null); // referencia al lienzo donde se dibuja
  const drawingRef = useRef(false); // true mientras el mouse/dedo esta presionado, dibujando
  const [hasStroke, setHasStroke] = useState(false); // true si ya se dibujo algo en el lienzo
  const [name, setName] = useState(signatureName || ''); // nombre completo de quien firma
  const [saving, setSaving] = useState(false);
  const [redoing, setRedoing] = useState(false); // true cuando el usuario pidio "Firmar de nuevo" sobre una firma ya guardada

  useEffect(() => { setName(signatureName || ''); }, [signatureName]);

  // Traduce la posicion del mouse o del dedo (que viene en pixeles de la
  // pantalla) a una posicion dentro del lienzo, para dibujar en el lugar
  // correcto sin importar el tamano en que se muestre el recuadro.
  const getPos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const point = e.touches ? e.touches[0] : e; // e.touches existe en pantallas tactiles (dedo); si no, es el mouse
    return {
      x: (point.clientX - rect.left) * (canvas.width / rect.width),
      y: (point.clientY - rect.top) * (canvas.height / rect.height),
    };
  };

  // Se dispara al presionar el mouse o tocar la pantalla: empieza un trazo
  // nuevo en el punto donde se toco.
  const start = (e) => {
    if (disabled) return;
    e.preventDefault();
    const ctx = canvasRef.current.getContext('2d');
    const { x, y } = getPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    drawingRef.current = true;
  };
  // Se dispara mientras se mueve el mouse (o el dedo) con el boton/touch
  // presionado: va dibujando una linea continua siguiendo el movimiento.
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
  // Se dispara al soltar el mouse o levantar el dedo: termina el trazo actual.
  const end = () => { drawingRef.current = false; };

  // Borra todo lo dibujado en el lienzo, dejandolo en blanco de nuevo.
  const clear = () => {
    const canvas = canvasRef.current;
    canvas?.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
    setHasStroke(false);
  };

  // Se ejecuta al apretar "Guardar firma": exige que ya se haya dibujado algo
  // y que se haya escrito el nombre de quien firma. Luego convierte el
  // dibujo del lienzo en una imagen PNG (como una foto de la firma) y la
  // envia para guardarla, igual que se sube una foto normal.
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

  // Se muestra el lienzo para dibujar solo si todavia no hay firma guardada,
  // o si el usuario pidio explicitamente "Firmar de nuevo"; si no, se muestra
  // la imagen de la firma ya guardada.
  const showCanvas = !signatureUrl || redoing;

  return (
    <div>
      <label style={lbl}>{label}</label>
      {!showCanvas ? (
        // Ya hay una firma guardada: se muestra la imagen y el nombre de quien firmo.
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
        // Todavia no hay firma (o se pidio firmar de nuevo): se muestra el
        // lienzo en blanco donde se puede dibujar con el mouse o el dedo.
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
