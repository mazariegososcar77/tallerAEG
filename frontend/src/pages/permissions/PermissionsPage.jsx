import { KeyRound } from "lucide-react";
import { useMemo } from 'react';
import { usePermissions } from '../../hooks/usePermissions.js';

const C = { card:'var(--c-surface)', dark:'var(--c-surface-2)', border:'var(--c-line)', text:'var(--c-text)', muted:'var(--c-muted)', orange:'#E8551C' };

export default function PermissionsPage() {
  const { permissions, loading } = usePermissions();
  const groups = useMemo(() => {
    const map = {};
    for (const p of permissions) { (map[p.module] ||= []).push(p); }
    return map;
  }, [permissions]);

  return (
    <div style={{ padding:'20px 16px', maxWidth:1100, margin:'0 auto' }}>
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20 }}>
        <KeyRound size={26} color="#E8551C" />
        <div>
          <h1 style={{ fontSize:20, fontWeight:700, margin:0, color:C.text }}>Permisos</h1>
          <p style={{ fontSize:13, color:C.muted, margin:0 }}>Catalogo de permisos del sistema (solo lectura)</p>
        </div>
      </div>

      {loading ? (
        <p style={{ color:C.muted, textAlign:'center', padding:40 }}>Cargando...</p>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(320px, 1fr))', gap:12 }}>
          {Object.entries(groups).map(([module, perms]) => (
            <div key={module} style={{ background:C.card, border:'1px solid '+C.border, borderRadius:12, padding:'16px 18px' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
                <h3 style={{ fontSize:14, fontWeight:700, color:C.text, margin:0 }}>{module}</h3>
                <span style={{ background:C.orange+'22', color:C.orange, border:'1px solid '+C.orange+'44', borderRadius:20, padding:'2px 8px', fontSize:11, fontWeight:600 }}>{perms.length}</span>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {perms.map(p => (
                  <div key={p.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8 }}>
                    <span style={{ fontSize:12, color:C.muted }}>{p.description}</span>
                    <code style={{ background:C.dark, border:'1px solid '+C.border, borderRadius:4, padding:'2px 6px', fontSize:10, color:C.orange, whiteSpace:'nowrap' }}>{p.code}</code>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
