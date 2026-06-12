import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, ShieldCheck, Contact, Package, ClipboardList, FileText, AlertTriangle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth.js';
import { usersApi } from '../api/usersApi.js';
import { rolesApi } from '../api/rolesApi.js';
import { clientsApi } from '../api/clientsApi.js';
import { articlesApi } from '../api/articlesApi.js';
import { workOrdersApi } from '../api/workOrdersApi.js';
import { quotesApi } from '../api/quotesApi.js';
import { maintenanceApi } from '../api/maintenanceApi.js';
import { notify } from '../lib/toast.js';

const C = { bg:'var(--c-app)', card:'var(--c-surface)', dark:'var(--c-surface-2)', border:'var(--c-line)', text:'var(--c-text)', muted:'var(--c-muted)', orange:'#E8551C' };

function StatCard({ icon: Icon, label, value, color, emoji, to }) {
  const navigate = useNavigate();
  return (
    <div onClick={() => to && navigate(to)} style={{ background:C.card, border:`1px solid ${color}44`, borderRadius:12, padding:'18px 20px', display:'flex', alignItems:'center', gap:16, cursor: to ? 'pointer' : 'default', transition:'transform 0.15s', }} onMouseEnter={e => { if(to) e.currentTarget.style.transform='translateY(-2px)'; }} onMouseLeave={e => e.currentTarget.style.transform='translateY(0)'}>
      <div style={{ background:color+'22', borderRadius:10, padding:12, fontSize:22 }}>
        {emoji ? <span>{emoji}</span> : <Icon size={24} color={color} />}
      </div>
      <div>
        <p style={{ fontSize:12, color:C.muted, margin:0, textTransform:'uppercase', letterSpacing:1, fontWeight:700 }}>{label}</p>
        <p style={{ fontSize:28, fontWeight:800, color:C.text, margin:0 }}>{value ?? '—'}</p>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user, hasPermission } = useAuth();
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

  const nombre = user?.name?.split(' ')[0] || '';
  const hora = new Date().getHours();
  const saludo = hora < 12 ? 'Buenos días' : hora < 18 ? 'Buenas tardes' : 'Buenas noches';

  return (
    <div style={{ padding:'4px 0' }}>

      {/* Banner */}
      <div style={{ background:`linear-gradient(135deg, #112048 0%, #1F3470 100%)`, borderRadius:14, padding:'24px 28px', marginBottom:24, border:`1px solid ${C.border}` }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:8 }}>
          <span style={{ fontSize:32 }}>🔧</span>
          <div>
            <h1 style={{ fontSize:22, fontWeight:800, color:'#fff', margin:0 }}>{saludo}, {nombre}!</h1>
            <p style={{ fontSize:13, color:'#94a3b8', margin:0 }}>
              Rol: <span style={{ color:C.orange, fontWeight:700 }}>{user?.role?.name}</span>
            </p>
          </div>
        </div>
        <p style={{ fontSize:13, color:'#94a3b8', margin:0 }}>Panel de administración — Taller AEG</p>
      </div>

      {/* Stats principales */}
      <p style={{ fontSize:11, fontWeight:800, color:C.muted, textTransform:'uppercase', letterSpacing:1, marginBottom:12 }}>📊 Resumen General</p>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))', gap:12, marginBottom:24 }}>
        {hasPermission('clients.view') && (
          <StatCard icon={Contact} label="Clientes" value={stats.clients} color="#3b82f6" to="/clientes" />
        )}
        {hasPermission('articles.view') && (
          <StatCard icon={Package} label="Inventario" value={stats.articles} color="#10b981" to="/inventario" />
        )}
        {hasPermission('dashboard.view') && (
          <StatCard icon={ClipboardList} label="Ordenes de Trabajo" value={stats.workOrders} color={C.orange} to="/ordenes" />
        )}
        {hasPermission('dashboard.view') && (
          <StatCard icon={FileText} label="Cotizaciones Activas" value={stats.quotes} color="#6366f1" to="/cotizaciones" />
        )}
        {hasPermission('dashboard.view') && (
          <StatCard icon={AlertTriangle} label="Mantenimientos Pendientes" value={stats.maintenance} color="#f59e0b" to="/mantenimientos" />
        )}
      </div>

      {/* Stats admin */}
      {(hasPermission('users.view') || hasPermission('roles.view')) && (
        <>
          <p style={{ fontSize:11, fontWeight:800, color:C.muted, textTransform:'uppercase', letterSpacing:1, marginBottom:12 }}>⚙️ Administración</p>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))', gap:12 }}>
            {hasPermission('users.view') && (
              <StatCard icon={Users} label="Usuarios" value={stats.users} color="#94a3b8" to="/usuarios" />
            )}
            {hasPermission('roles.view') && (
              <StatCard icon={ShieldCheck} label="Roles" value={stats.roles} color="#94a3b8" to="/roles" />
            )}
          </div>
        </>
      )}
    </div>
  );
}
