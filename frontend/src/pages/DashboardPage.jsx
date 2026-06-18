import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, ShieldCheck, Contact, Package, ClipboardList, FileText, AlertTriangle } from 'lucide-react';
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

// Altura del area visible del carrusel (~3 tarjetas) y mascara de desvanecido en los bordes.
const CAROUSEL_HEIGHT = 300;
const FADE_MASK = 'linear-gradient(to bottom, transparent 0, #000 14%, #000 86%, transparent 100%)';

function NavCard({ icon: Icon, label, value, color, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{ background:C.card, border:`1px solid ${color}44`, borderRadius:12, padding:'16px 18px', display:'flex', alignItems:'center', gap:16, cursor:'pointer', scrollSnapAlign:'start', flexShrink:0, transition:'transform 0.15s, box-shadow 0.15s' }}
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

  // En escritorio el carrusel es un area con scroll y desvanecido en los bordes;
  // en movil se muestran todas las tarjetas apiladas (la pagina hace scroll).
  const scrollAreaStyle = isMobile
    ? { display:'flex', flexDirection:'column', gap:12 }
    : {
        display:'flex', flexDirection:'column', gap:12,
        maxHeight: CAROUSEL_HEIGHT, overflowY:'auto', paddingBottom:2,
        scrollSnapType:'y proximity',
        WebkitMaskImage: FADE_MASK, maskImage: FADE_MASK,
      };

  return (
    <div style={{ padding:'4px 0' }}>
      <p style={{ fontSize:11, fontWeight:800, color:C.muted, textTransform:'uppercase', letterSpacing:1, marginBottom:12 }}>Panel de administracion — Taller AEG</p>

      <div style={{ display:'flex', flexDirection: isMobile ? 'column' : 'row', alignItems:'flex-start', gap:20 }}>

        {/* Carrusel vertical de accesos (scroll + desvanecido) */}
        <div className="no-scrollbar" style={{ width: isMobile ? '100%' : 300, flexShrink:0, ...scrollAreaStyle }}>
          {cards.map(c => (
            <NavCard key={c.key} icon={c.icon} label={c.label} value={c.value} color={c.color} onClick={() => navigate(c.to)} />
          ))}
        </div>

        {/* Calendario (vista principal) */}
        {hasPermission('dashboard.view') && (
          <div style={{ flex:1, width: isMobile ? '100%' : 'auto', minWidth:0, display:'flex', justifyContent:'center' }}>
            <MaintenanceCalendar />
          </div>
        )}
      </div>
    </div>
  );
}
