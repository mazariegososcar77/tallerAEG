import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';
import Topbar from './Topbar.jsx';

/**
 * AppLayout es el "armazon" o marco general de la aplicacion una vez que el
 * usuario ya inicio sesion: el menu lateral (Sidebar) a la izquierda, la
 * barra superior (Topbar) arriba, y en medio el contenido de la pantalla que
 * corresponda (Dashboard, Inventario, Clientes, etc.). Ese contenido cambia
 * segun la pagina en la que este el usuario, mediante `<Outlet />` (una
 * especie de "hueco" donde React Router coloca la pagina actual).
 */
export default function AppLayout() {
  // Controla si el menu lateral esta abierto en pantallas de celular (donde
  // el menu normalmente esta oculto y se abre con el boton de hamburguesa).
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <div className="flex h-screen overflow-hidden bg-app">
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar onMenu={() => setMobileOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="mx-auto max-w-6xl animate-fade-in">
            {/* Aqui se muestra la pagina actual (Dashboard, Inventario, etc.) */}
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
