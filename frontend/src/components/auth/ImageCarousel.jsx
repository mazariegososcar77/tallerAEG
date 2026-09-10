import { useState, useEffect } from 'react';

// Este componente es el carrusel de imagenes grandes que se ve al lado del
// formulario de inicio de sesion (pantalla de Login). Va cambiando de imagen
// solo, cada pocos segundos, mostrando una frase distinta en cada una.

// Slides del login. Reemplaza las imagenes en public/img/carrusel/ conservando los nombres.
const SLIDES = [
  {
    src: '/img/carrusel/slide-1.png',
    title: 'Gestion integral del centro de servicios',
    subtitle: 'Administra usuarios, roles y permisos desde un solo lugar.',
  },
  {
    src: '/img/carrusel/slide-2.png',
    title: 'Control de accesos',
    subtitle: 'Define que puede hacer cada miembro del equipo.',
  },
  {
    src: '/img/carrusel/slide-3.png',
    title: 'Centro de Servicio AEG',
    subtitle: 'Especialistas en motores electricos.',
  },
];

export default function ImageCarousel() {
  // "index" guarda cual de las 3 imagenes se esta mostrando en este momento.
  const [index, setIndex] = useState(0);

  // Cada 5 segundos avanza a la siguiente imagen automaticamente (y al llegar
  // a la ultima, vuelve a empezar desde la primera). Cuando el componente
  // desaparece de la pantalla, se detiene el contador para no dejarlo corriendo.
  useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % SLIDES.length), 5000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="relative h-full w-full overflow-hidden bg-navy-700">
      {/* Dibuja las 3 imagenes una encima de otra; solo se ve la que esta activa
          (las demas quedan invisibles con una transicion suave de opacidad). */}
      {SLIDES.map((slide, i) => (
        <div
          key={slide.src}
          className={`absolute inset-0 transition-opacity duration-1000 ${
            i === index ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <img src={slide.src} alt="" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-navy-900/85 via-navy-900/30 to-transparent" />
          <div className="absolute inset-x-10 bottom-20 text-white">
            <h2 className="text-3xl font-bold leading-tight">{slide.title}</h2>
            <p className="mt-2 max-w-md text-navy-100">{slide.subtitle}</p>
          </div>
        </div>
      ))}

      {/* Puntitos de navegacion en la parte inferior: al hacer clic en uno,
          salta directo a esa imagen sin esperar el cambio automatico. */}
      <div className="absolute bottom-10 left-10 flex gap-2">
        {SLIDES.map((slide, i) => (
          <button
            key={slide.src}
            onClick={() => setIndex(i)}
            aria-label={`Ir a la imagen ${i + 1}`}
            className={`h-2 rounded-full transition-all ${
              i === index ? 'w-8 bg-orange-500' : 'w-2 bg-white/50 hover:bg-white/80'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
