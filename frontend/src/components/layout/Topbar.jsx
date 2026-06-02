import { useNavigate } from 'react-router-dom';
import { Menu, LogOut } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth.js';
import { notify } from '../../lib/toast.js';

export default function Topbar({ onMenu }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    notify.info('Sesion cerrada');
    navigate('/login');
  };

  const initial = (user?.name || '?').charAt(0).toUpperCase();

  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
      <button
        onClick={onMenu}
        className="rounded-md p-2 text-navy-700 hover:bg-slate-100 lg:hidden"
        aria-label="Abrir menu"
      >
        <Menu size={20} />
      </button>

      <div className="ml-auto flex items-center gap-3">
        <div className="hidden text-right sm:block">
          <p className="text-sm font-medium text-navy-800">{user?.name}</p>
          <p className="text-xs text-slate-500">{user?.role?.name}</p>
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-500 font-semibold text-white">
          {initial}
        </div>
        <button
          onClick={handleLogout}
          className="rounded-md p-2 text-slate-500 hover:bg-red-50 hover:text-red-600"
          title="Cerrar sesion"
          aria-label="Cerrar sesion"
        >
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}
