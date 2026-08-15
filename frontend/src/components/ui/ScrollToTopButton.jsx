import { useState, useEffect } from 'react';
import { ArrowUp } from 'lucide-react';

// Cuanto hay que bajar (en pixeles) antes de que aparezca el boton. El mismo
// numero resuelve las dos reglas a la vez: en una pantalla corta, el maximo
// scroll posible (scrollHeight - clientHeight) nunca llega a superar esto, asi
// que el boton simplemente nunca se muestra -- no hace falta un chequeo aparte
// de "esta pantalla es muy corta".
const SHOW_AFTER_PX = 400;

/**
 * Boton flotante "volver arriba". Se le pasa `containerRef`: el elemento que
 * de verdad hace scroll (en este layout es el <main>, no la ventana -- ver
 * AppLayout.jsx, que tiene su propio overflow-y-auto). Aparece solo despues
 * de bajar SHOW_AFTER_PX, y al hacer clic sube con scroll suave hasta arriba
 * de ESE contenedor.
 */
export default function ScrollToTopButton({ containerRef }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return undefined;

    const onScroll = () => setVisible(el.scrollTop > SHOW_AFTER_PX);
    onScroll(); // por si la pantalla ya carga con scroll (ej. se volvio de otra ruta)
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [containerRef]);

  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={() => containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="Volver arriba"
      title="Volver arriba"
      className="fixed bottom-5 right-5 z-20 flex h-11 w-11 items-center justify-center rounded-full
        bg-navy-700 text-white shadow-lg transition-colors hover:bg-navy-800 animate-fade-in
        sm:bottom-6 sm:right-6"
    >
      <ArrowUp size={20} />
    </button>
  );
}
