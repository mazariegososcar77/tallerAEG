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
    <header style={{ background:'#1f2937', borderBottom:'1px solid #1F3470', padding:'10px 16px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
      <button onClick={onMenu} style={{ background:'transparent', border:'none', color:'#94a3b8', cursor:'pointer', padding:8, borderRadius:6, display:'flex' }} className="lg:hidden" aria-label="Abrir menu">
        <Menu size={20} />
      </button>
      <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:12 }}>
        <div style={{ textAlign:'right', display:'flex', flexDirection:'column' }} className="hidden sm:block">
          <p style={{ fontSize:13, fontWeight:600, color:'#e2e8f0', margin:0 }}>{user?.name}</p>
          <p style={{ fontSize:11, color:'#5a7aa8', margin:0 }}>{user?.role?.name}</p>
        </div>
        <div style={{ width:36, height:36, borderRadius:'50%', background:'#E8551C', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, color:'#fff', fontSize:15 }}>
          {initial}
        </div>
        <button onClick={handleLogout} style={{ background:'transparent', border:'none', color:'#5a7aa8', cursor:'pointer', padding:8, borderRadius:6, display:'flex' }} title="Cerrar sesion">
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}
