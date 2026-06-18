import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, ShieldCheck, Contact, Package, ClipboardList, FileText, AlertTriangle, ChevronUp, ChevronDown } from 'lucide-react';
import { useAuth } from '../hooks/useAuth.js';
import { useIsMobile } from '../hooks/useIsMobile.js';
import { usersApi } from '../api/usersApi.js';
import { rolesApi } from '../api/rolesApi.js';
import { clientsApi } from '../api/clientsApi.js';
import { articlesApi } from '../api/articlesApi.js';
import { workOrdersApi } from '../api/workOrdersApi.js';
import { quotesApi } from '../api/quotesApi.js';
import { maintenanceApi } from '../api/maintenanceApi.js';
import { notify } from '../lib/toast.js';
import MaintenanceCalendar from '../components/dashboard/MaintenanceCalendar.jsx';

const C = { bg:'var(--c-app)', card:'var(--c-surface)', dark:'var(--c-surface-2)', border:'var(--c-line)', text:'var(--c-text)', muted:'var(--c-muted)', orange:'#E8551C' };

const VISIBLE = 3; // tarjetas visibles en el carrusel

function NavCard({ icon: Icon, label, value, color, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{ background:C.card, border:`1px solid ${color}44`, borderRadius:12, padding:'16px 18px', display:'flex', alignItems:'center', gap:16, cursor:'pointer', transition:'transform 0.15s, box-shadow 0.15s' }}
      onMouseEnter={e => { e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow=`0 6px 18px ${color}22`; }}
      onMouseLeave={e => { e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow='none'; }}
    >
      <div style={{ background:color+'22', borderRadius:10, padding:12, display:'flex' }}>
        <Icon size={24} color={color} />
      </div>
      <div>
        <p style={{ fontSize:12, color:C.muted, margin:0, textTransform:'uppercase', letterSpacing:1, fontWeight:700 }}>{label}</p>
        <p style={{ fontSize:28, fontWeight:800, color:C.text, margin:0 }}>{value ?? '—'}</p>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { hasPermission } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [stats, setStats] = useState({});
  const [start, setStart] = useState(0);

  useEffect(() => {
    const load = async () => {
      const next = {};
      try {
        if (hasPermission('clients.view'))     next.clients     = (await clientsApi.list()).length;
        if (hasPermission('articles.view'))    next.articles    = (await articlesApi.list()).length;
        if (hasPermission('dashboard.view'))   next.workOrders  = (await workOrdersApi.list()).length;
        if (hasPermission('dashboard.view'))   next.quotes      = (await quotesApi.list()).filter(q => q.status !== 'rechazada' && q.status !== 'vencida').length;
        if (hasPermission('dashboard.view'))   next.maintenance = (await maintenanceApi.list()).filter(m => m.status === 'proximo' || m.status === 'vencido').length;
        if (hasPermission('users.view'))       next.users       = (await usersApi.list()).length;
        if (hasPermission('roles.view'))       next.roles       = (await rolesApi.list()).length;
      } catch(err) { notify.error(err.message); }
      setStats(next);
    };
    load();
  }, [hasPermission]);

  // Definicion de las tarjetas del carrusel (filtradas por permiso).
  const cards = [
    hasPermission('clients.view')   && { key:'clients',     icon:Contact,       label:'Clientes',               value:stats.clients,     color:'#3b82f6', to:'/clientes' },
    hasPermission('articles.view')  && { key:'articles',    icon:Package,       label:'Inventario',             value:stats.articles,    color:'#10b981', to:'/inventario' },
    hasPermission('dashboard.view') && { key:'workOrders',  icon:ClipboardList, label:'Ordenes de Trabajo',     value:stats.workOrders,  color:C.orange,  to:'/ordenes' },
    hasPermission('dashboard.view') && { key:'quotes',      icon:FileText,      label:'Cotizaciones Activas',   value:stats.quotes,      color:'#6366f1', to:'/cotizaciones' },
    hasPermission('dashboard.view') && { key:'maintenance', icon:AlertTriangle, label:'Mantenimientos Pend.',   value:stats.maintenance, color:'#f59e0b', to:'/mantenimientos' },
    hasPermission('users.view')     && { key:'users',       icon:Users,         label:'Usuarios',               value:stats.users,       color:'#94a3b8', to:'/usuarios' },
    hasPermission('roles.view')     && { key:'roles',       icon:ShieldCheck,   label:'Roles',                  value:stats.roles,       color:'#94a3b8', to:'/roles' },
  ].filter(Boolean);

  const total = cards.length;
  const canScroll = total > VISIBLE && !isMobile;
  const visibleCards = isMobile ? cards : (canScroll ? Array.from({ length: VISIBLE }, (_, i) => cards[(start + i) % total]) : cards);

  const goUp = () => setStart(s => (s - 1 + total) % total);
  const goDown = () => setStart(s => (s + 1) % total);

  const arrowBtn = { display:'flex', alignItems:'center', justifyContent:'center', width:'100%', padding:'6px 0', background:C.dark, border:`1px solid ${C.border}`, borderRadius:10, color:C.muted, cursor:'pointer' };

  return (
    <div style={{ padding:'4px 0' }}>
      <p style={{ fontSize:11, fontWeight:800, color:C.muted, textTransform:'uppercase', letterSpacing:1, marginBottom:12 }}>Panel de administracion — Taller AEG</p>

      <div style={{ display:'flex', flexDirection: isMobile ? 'column' : 'row', alignItems:'flex-start', gap:20 }}>

        {/* Carrusel vertical de accesos */}
        <div style={{ width: isMobile ? '100%' : 300, flexShrink:0, display:'flex', flexDirection:'column', gap:10 }}>
          {canScroll && (
            <button onClick={goUp} style={arrowBtn} title="Anterior" aria-label="Anterior"><ChevronUp size={18} /></button>
          )}
          {visibleCards.map(c => (
            <NavCard key={c.key} icon={c.icon} label={c.label} value={c.value} color={c.color} onClick={() => navigate(c.to)} />
          ))}
          {canScroll && (
            <button onClick={goDown} style={arrowBtn} title="Siguiente" aria-label="Siguiente"><ChevronDown size={18} /></button>
          )}
        </div>

        {/* Calendario (vista principal) */}
        {hasPermission('dashboard.view') && (
          <div style={{ flex:1, width: isMobile ? '100%' : 'auto', minWidth:0 }}>
            <MaintenanceCalendar />
          </div>
        )}
      </div>
    </div>
  );
}
