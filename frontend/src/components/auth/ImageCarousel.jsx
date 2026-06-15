import { useState, useEffect } from 'react';

// Slides del login. Reemplaza las imagenes en public/img/carrusel/ conservando los nombres.
const SLIDES = [
  {
    src: '/img/carrusel/slide-1.png',
    title: 'Gestion integral del taller',
    subtitle: 'Administra usuarios, roles y permisos desde un solo lugar.',
  },
  {
    src: '/img/carrusel/slide-2.png',
    title: 'Control de accesos',
    subtitle: 'Define que puede hacer cada miembro del equipo.',
  },
  {
    src: '/img/carrusel/slide-3.png',
    title: 'Taller AEG',
    subtitle: 'Especialistas en motores electricos.',
  },
];

export default function ImageCarousel() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % SLIDES.length), 5000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="relative h-full w-full overflow-hidden bg-navy-700">
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
