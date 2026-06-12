import { useState } from 'react';
import { Plus, Pencil, Trash2, Users } from 'lucide-react';
import { useUsers } from '../../hooks/useUsers.js';
import { useRoles } from '../../hooks/useRoles.js';
import { useAuth } from '../../hooks/useAuth.js';
import { usersApi } from '../../api/usersApi.js';
import { notify } from '../../lib/toast.js';
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx';
import UserFormModal from './UserFormModal.jsx';

const C = { card:'#16285C', dark:'#112048', border:'#1F3470', input:'#0C1733', text:'#e2e8f0', muted:'#5a7aa8', orange:'#E8551C' };

const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  return isMobile;
};

export default function UsersPage() {
  const { users, loading, reload } = useUsers();
  const { roles } = useRoles();
  const { hasPermission } = useAuth();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const isMobile = useIsMobile();

  const openCreate = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (u) => { setEditing(u); setFormOpen(true); };
  const handleSaved = () => { setFormOpen(false); reload(); };
  const handleDelete = async () => {
    try {
      await usersApi.remove(deleting.id);
      notify.success('Usuario eliminado');
      setDeleting(null); reload();
    } catch(err) { notify.error(err.message); }
  };

  return (
    <div style={{ padding:'20px 16px', maxWidth:1100, margin:'0 auto' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12, marginBottom:20 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <Users size={26} color="#E8551C" />
          <div>
            <h1 style={{ fontSize:20, fontWeight:700, margin:0, color:C.text }}>Usuarios</h1>
            <p style={{ fontSize:13, color:C.muted, margin:0 }}>{users.length} usuarios registrados</p>
          </div>
        </div>
        {hasPermission('users.create') && (
          <button onClick={openCreate} style={{ display:'flex', alignItems:'center', gap:6, background:C.orange, color:'#fff', border:'none', borderRadius:8, padding:'9px 16px', fontWeight:600, cursor:'pointer', fontSize:13 }}>
            <Plus size={16} /> Nuevo usuario
          </button>
        )}
      </div>

      <div style={{ background:C.card, border:'1px solid '+C.border, borderRadius:12, overflow:'hidden' }}>

        {/* Desktop */}
        {!isMobile && (
          <>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 150px 100px 100px', background:C.dark, padding:'10px 16px', borderBottom:'1px solid '+C.border }}>
              {['Nombre','Correo','Rol','Estado','Acciones'].map((h,i) => (
                <span key={i} style={{ fontSize:11, fontWeight:800, color:C.muted, textTransform:'uppercase', letterSpacing:'.6px', textAlign:i===4?'right':'left' }}>{h}</span>
              ))}
            </div>
            {loading ? (
              <p style={{ color:C.muted, textAlign:'center', padding:40 }}>Cargando...</p>
            ) : users.length === 0 ? (
              <div style={{ textAlign:'center', padding:'48px 0', color:C.muted }}>
                <span style={{ fontSize:48, opacity:.3 }}>👤</span>
                <p>No hay usuarios registrados</p>
              </div>
            ) : users.map(u => (
              <div key={u.id} style={{ display:'grid', gridTemplateColumns:'1fr 1fr 150px 100px 100px', padding:'12px 16px', borderBottom:'1px solid '+C.border, alignItems:'center' }}>
                <span style={{ fontWeight:600, color:C.text }}>{u.name}</span>
                <span style={{ fontSize:13, color:C.muted }}>{u.email}</span>
                <span style={{ background:C.orange+'22', color:C.orange, border:'1px solid '+C.orange+'44', borderRadius:20, padding:'2px 8px', fontSize:11, fontWeight:600, width:'fit-content' }}>{u.role_name}</span>
                <span style={{ background:u.is_active?'#10b98122':'#ef444422', color:u.is_active?'#10b981':'#ef4444', border:'1px solid '+(u.is_active?'#10b98144':'#ef444444'), borderRadius:20, padding:'2px 8px', fontSize:11, fontWeight:600, width:'fit-content' }}>
                  {u.is_active ? 'Activo' : 'Inactivo'}
                </span>
                <div style={{ display:'flex', gap:6, justifyContent:'flex-end' }}>
                  {hasPermission('users.update') && <button onClick={() => openEdit(u)} style={{ background:C.dark, border:'1px solid '+C.border, borderRadius:6, padding:'5px 8px', cursor:'pointer', color:C.muted }}><Pencil size={14}/></button>}
                  {hasPermission('users.delete') && <button onClick={() => setDeleting(u)} style={{ background:'#ef444415', border:'1px solid #ef444440', borderRadius:6, padding:'5px 8px', cursor:'pointer', color:'#ef4444' }}><Trash2 size={14}/></button>}
                </div>
              </div>
            ))}
          </>
        )}

        {/* Mobile - Cards */}
        {isMobile && (
          <>
            {loading ? (
              <p style={{ color:C.muted, textAlign:'center', padding:40 }}>Cargando...</p>
            ) : users.length === 0 ? (
              <div style={{ textAlign:'center', padding:'48px 0', color:C.muted }}>
                <span style={{ fontSize:48, opacity:.3 }}>👤</span>
                <p>No hay usuarios registrados</p>
              </div>
            ) : users.map(u => (
              <div key={u.id} style={{ padding:'14px 16px', borderBottom:'1px solid '+C.border }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                  <div style={{ flex:1 }}>
                    <span style={{ fontWeight:700, color:C.text, fontSize:14 }}>{u.name}</span>
                    <p style={{ fontSize:12, color:C.muted, margin:'3px 0' }}>{u.email}</p>
                    <div style={{ display:'flex', gap:6, marginTop:6, flexWrap:'wrap' }}>
                      <span style={{ background:C.orange+'22', color:C.orange, border:'1px solid '+C.orange+'44', borderRadius:20, padding:'2px 8px', fontSize:11, fontWeight:600 }}>{u.role_name}</span>
                      <span style={{ background:u.is_active?'#10b98122':'#ef444422', color:u.is_active?'#10b981':'#ef4444', border:'1px solid '+(u.is_active?'#10b98144':'#ef444444'), borderRadius:20, padding:'2px 8px', fontSize:11, fontWeight:600 }}>
                        {u.is_active ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                  </div>
                  <div style={{ display:'flex', gap:6, marginLeft:10 }}>
                    {hasPermission('users.update') && <button onClick={() => openEdit(u)} style={{ background:C.dark, border:'1px solid '+C.border, borderRadius:6, padding:'8px 10px', cursor:'pointer', color:C.muted }}><Pencil size={15}/></button>}
                    {hasPermission('users.delete') && <button onClick={() => setDeleting(u)} style={{ background:'#ef444415', border:'1px solid #ef444440', borderRadius:6, padding:'8px 10px', cursor:'pointer', color:'#ef4444' }}><Trash2 size={15}/></button>}
                  </div>
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      <UserFormModal open={formOpen} onClose={() => setFormOpen(false)} onSaved={handleSaved} user={editing} roles={roles} />
      <ConfirmDialog open={Boolean(deleting)} onClose={() => setDeleting(null)} onConfirm={handleDelete}
        title="Eliminar usuario" message={`Se eliminara a "${deleting?.name}". Esta accion no se puede deshacer.`} confirmText="Eliminar" />
    </div>
  );
}