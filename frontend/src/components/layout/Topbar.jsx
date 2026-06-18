import { useNavigate } from 'react-router-dom';
import { Menu, LogOut, Sun, Moon } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth.js';
import { useTheme } from '../../hooks/useTheme.js';
import { notify } from '../../lib/toast.js';
export default function Topbar({ onMenu }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const handleLogout = async () => {
    await logout();
    notify.info('Sesion cerrada');
    navigate('/login');
  };
  const initial = (user?.name || '?').charAt(0).toUpperCase();
  const nombre = user?.name?.split(' ')[0] || '';
  const hora = new Date().getHours();
  const saludo = hora < 12 ? 'Buenos dias' : hora < 18 ? 'Buenas tardes' : 'Buenas noches';
  return (
    <header style={{ background:'var(--c-surface)', borderBottom:'1px solid var(--c-line)', padding:'10px 16px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
      <div style={{ display:'flex', alignItems:'center', gap:10, minWidth:0 }}>
        <button onClick={onMenu} style={{ background:'transparent', border:'none', color:'var(--c-muted)', cursor:'pointer', padding:8, borderRadius:6, display:'flex', flexShrink:0 }} className="lg:hidden" aria-label="Abrir menu">
          <Menu size={20} />
        </button>
        <p style={{ fontSize:15, fontWeight:700, color:'var(--c-text)', margin:0, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
          {saludo}{nombre ? `, ${nombre}` : ''}
        </p>
      </div>
      <div style={{ marginLeft:'auto', flexShrink:0, display:'flex', alignItems:'center', gap:12 }}>
        <button
          onClick={toggleTheme}
          style={{ background:'transparent', border:'1px solid var(--c-line)', color:'var(--c-muted)', cursor:'pointer', padding:8, borderRadius:8, display:'flex' }}
          title={theme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
          aria-label="Cambiar tema"
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <div style={{ textAlign:'right', display:'flex', flexDirection:'column' }} className="hidden sm:block">
          <p style={{ fontSize:13, fontWeight:600, color:'var(--c-text)', margin:0 }}>{user?.name}</p>
          <p style={{ fontSize:11, color:'var(--c-muted)', margin:0 }}>{user?.role?.name}</p>
        </div>
        <div style={{ width:36, height:36, borderRadius:'50%', background:'#E8551C', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, color:'#fff', fontSize:15 }}>
          {initial}
        </div>
        <button onClick={handleLogout} style={{ background:'transparent', border:'none', color:'var(--c-muted)', cursor:'pointer', padding:8, borderRadius:6, display:'flex' }} title="Cerrar sesion">
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}
