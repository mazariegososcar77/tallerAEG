import { useState, useEffect } from 'react';

/**
 * Devuelve true cuando el ancho de la ventana es menor al breakpoint (768px por
 * defecto). Reactivo: se actualiza al redimensionar/rotar la pantalla.
 */
export function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < breakpoint,
  );

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < breakpoint);
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [breakpoint]);

  return isMobile;
}
