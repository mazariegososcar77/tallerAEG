// Este archivo ayuda a saber si la pantalla es de celular o tablet (angosta) o de
// computadora, para que la interfaz se acomode automáticamente.
import { useState, useEffect } from 'react';

// Igual que en Sidebar.jsx: desde 1024px de ancho (`lg`) el menú lateral deja de ser un
// cajón que se abre encima y pasa a ocupar espacio fijo (256px completo, 80px angosto).
const LG = 1024;
const SIDEBAR_STORAGE_KEY = 'taller_aeg_sidebar_collapsed';
const SIDEBAR_FULL = 256;
const SIDEBAR_SLIM = 80;

// Ancho que de verdad le queda al contenido: la ventana menos el menú lateral cuando este va fijo.
function contentWidth() {
  const w = window.innerWidth;
  if (w < LG) return w;
  let slim = false;
  try { slim = localStorage.getItem(SIDEBAR_STORAGE_KEY) === '1'; } catch { /* sin storage: menu completo */ }
  return w - (slim ? SIDEBAR_SLIM : SIDEBAR_FULL);
}

/**
 * Dice si la pantalla es "de celular o tablet": responde true cuando el ANCHO QUE LE QUEDA AL
 * CONTENIDO es menor a 900 píxeles (o al número que se le indique). Se mide el ancho del
 * contenido y no el de la ventana porque, desde 1024px, el menú lateral se come 256px: una
 * tablet en horizontal (1024–1180px) tiene ventana "grande" pero solo ~770–920px para las
 * pantallas, y las tablas de escritorio (varias columnas de ancho fijo) no caben ahí.
 * Con este criterio: celulares y tablets en vertical -> vista compacta (tarjetas, campos en
 * 1–2 columnas); tablets en horizontal chicas también; laptops y monitores -> vista completa.
 * Se actualiza solo si el usuario gira el dispositivo, cambia el tamaño de la ventana o
 * contrae/expande el menú lateral (el Sidebar avisa con un evento `resize`).
 */
export function useIsMobile(minContent = 900) {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && contentWidth() < minContent,
  );

  useEffect(() => {
    const onResize = () => setIsMobile(contentWidth() < minContent);
    onResize();
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    };
  }, [minContent]);

  return isMobile;
}

/**
 * Dice si la pantalla es de TABLET: el contenido mide entre 600px y el limite de "celular"
 * (900px por defecto). Sirve para que los formularios que en celular van a 1 o 2 columnas
 * aprovechen el ancho de una tablet (3 o 4 columnas) sin llegar a la vista de escritorio.
 */
export function useIsTablet(minContent = 900, minTablet = 600) {
  const read = () => {
    const w = contentWidth();
    return w >= minTablet && w < minContent;
  };
  const [isTablet, setIsTablet] = useState(() => typeof window !== 'undefined' && read());

  useEffect(() => {
    const onResize = () => setIsTablet(read());
    onResize();
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    };
  }, [minContent, minTablet]);

  return isTablet;
}
