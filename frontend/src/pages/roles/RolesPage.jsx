import { useState } from 'react';
import { Plus, Pencil, Trash2, ShieldCheck } from 'lucide-react';
import { useRoles } from '../../hooks/useRoles.js';
import { usePermissions } from '../../hooks/usePermissions.js';
import { useAuth } from '../../hooks/useAuth.js';
import { rolesApi } from '../../api/rolesApi.js';
import { notify } from '../../lib/toast.js';
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx';
import RoleFormModal from './RoleFormModal.jsx';

const C = { card:'#16285C', dark:'#112048', border:'#1F3470', input:'#0C1733', text:'#e2e8f0', muted:'#5a7aa8', orange:'#E8551C' };

export default function RolesPage() {
  const { roles, loading, reload } = useRoles();
  const { permissions } = usePermissions();
  const { hasPermission } = useAuth();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const openCreate = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (r) => { setEditing(r); setFormOpen(true); };
  const handleSaved = () => { setFormOpen(false); reload(); };
  const handleDelete = async () => {
    try {
      await rolesApi.remove(deleting.id);
      notify.success('Rol eliminado');
      setDeleting(null); reload();
    } catch(err) { notify.error(err.message); }
  };

  return (
    <div style={{ padding:'20px 16px', maxWidth:1100, margin:'0 auto' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12, marginBottom:20 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <ShieldCheck size={26} color="#E8551C" />
          <div>
            <h1 style={{ fontSize:20, fontWeight:700, margin:0, color:C.text }}>Roles</h1>
            <p style={{ fontSize:13, color:C.muted, margin:0 }}>{roles.length} roles registrados</p>
          </div>
        </div>
        {hasPermission('roles.create') && (
          <button onClick={openCreate} style={{ display:'flex', alignItems:'center', gap:6, background:C.orange, color:'#fff', border:'none', borderRadius:8, padding:'9px 16px', fontWeight:600, cursor:'pointer', fontSize:13 }}>
            <Plus size={16} /> Nuevo rol
          </button>
        )}
      </div>

      <div style={{ background:C.card, border:'1px solid '+C.border, borderRadius:12, overflow:'hidden' }}>
        <div style={{ display:'grid', gridTemplateColumns:'150px 1fr 150px 100px', background:C.dark, padding:'10px 16px', borderBottom:'1px solid '+C.border }}>
          {['Rol','Descripcion','Permisos','Acciones'].map((h,i) => (
            <span key={i} style={{ fontSize:11, fontWeight:800, color:C.muted, textTransform:'uppercase', letterSpacing:'.6px', textAlign:i===3?'right':'left' }}>{h}</span>
          ))}
        </div>
        {loading ? (
          <p style={{ color:C.muted, textAlign:'center', padding:40 }}>Cargando...</p>
        ) : roles.length === 0 ? (
          <div style={{ textAlign:'center', padding:'48px 0', color:C.muted }}>
            <span style={{ fontSize:48, opacity:.3 }}>🛡️</span>
            <p>No hay roles registrados</p>
          </div>
        ) : roles.map(r => (
          <div key={r.id} style={{ display:'grid', gridTemplateColumns:'150px 1fr 150px 100px', padding:'12px 16px', borderBottom:'1px solid '+C.border, alignItems:'center' }}>
            <span style={{ fontWeight:700, color:C.text }}>{r.name}</span>
            <span style={{ fontSize:13, color:C.muted }}>{r.description || '—'}</span>
            <span style={{ background:C.orange+'22', color:C.orange, border:'1px solid '+C.orange+'44', borderRadius:20, padding:'2px 8px', fontSize:11, fontWeight:600, width:'fit-content' }}>{r.permissions.length} permisos</span>
            <div style={{ display:'flex', gap:6, justifyContent:'flex-end' }}>
              {hasPermission('roles.update') && <button onClick={() => openEdit(r)} style={{ background:C.dark, border:'1px solid '+C.border, borderRadius:6, padding:'5px 8px', cursor:'pointer', color:C.muted }}><Pencil size={14}/></button>}
              {hasPermission('roles.delete') && <button onClick={() => setDeleting(r)} style={{ background:'#ef444415', border:'1px solid #ef444440', borderRadius:6, padding:'5px 8px', cursor:'pointer', color:'#ef4444' }}><Trash2 size={14}/></button>}
            </div>
          </div>
        ))}
      </div>

      <RoleFormModal open={formOpen} onClose={() => setFormOpen(false)} onSaved={handleSaved} role={editing} permissions={permissions} />
      <ConfirmDialog open={Boolean(deleting)} onClose={() => setDeleting(null)} onConfirm={handleDelete}
        title="Eliminar rol" message={`Se eliminara el rol "${deleting?.name}". Esta accion no se puede deshacer.`} confirmText="Eliminar" />
    </div>
  );
}
