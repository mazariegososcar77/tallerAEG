// Este archivo ayuda a saber si la pantalla es de celular (angosta) o de
// computadora, para que la interfaz se acomode automáticamente.
import { useState, useEffect } from 'react';

/**
 * Dice si la pantalla es "de celular": responde true cuando el ancho de la
 * ventana es menor a 768 píxeles (o al número que se le indique). Se actualiza
 * solo si el usuario gira el celular o cambia el tamaño de la ventana.
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
