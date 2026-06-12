import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Pencil, Trash2, Upload, Package, Search, Eye } from 'lucide-react';
import { useArticles } from '../../hooks/useArticles.js';
import { useArticleTypes } from '../../hooks/useArticleTypes.js';
import { useWarehouses } from '../../hooks/useWarehouses.js';
import { useAuth } from '../../hooks/useAuth.js';
import { articlesApi } from '../../api/articlesApi.js';
import { notify } from '../../lib/toast.js';
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx';
import BulkUploadModal from './BulkUploadModal.jsx';
import ArticleViewModal from './ArticleViewModal.jsx';

const C = { bg:'#0C1733', card:'#16285C', dark:'#112048', border:'#1F3470', input:'#0C1733', text:'#e2e8f0', muted:'#5a7aa8', orange:'#E8551C' };
const inp = { background:C.input, border:'1px solid '+C.border, color:C.text, padding:'8px 10px', borderRadius:6, fontSize:13, outline:'none' };

function Thumb({ url, name }) {
  const [broken, setBroken] = useState(false);
  if (!url || broken) return (
    <div style={{ width:38, height:38, borderRadius:6, background:C.dark, border:'1px solid '+C.border, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <Package size={16} color={C.muted} />
    </div>
  );
  return <img src={url} alt={name} onError={() => setBroken(true)} style={{ width:38, height:38, borderRadius:6, objectFit:'cover', border:'1px solid '+C.border }} />;
}

export default function ArticlesPage() {
  const navigate = useNavigate();
  const { articles, loading, reload } = useArticles();
  const { types } = useArticleTypes();
  const { warehouses } = useWarehouses();
  const { hasPermission } = useAuth();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('');
  const [bulkOpen, setBulkOpen] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [viewing, setViewing] = useState(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return articles.filter(a => {
      if (typeFilter && a.type_id !== Number(typeFilter)) return false;
      if (warehouseFilter && a.warehouse_id !== Number(warehouseFilter)) return false;
      if (q && !`${a.code} ${a.name}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [articles, search, typeFilter, warehouseFilter]);

  const handleDelete = async () => {
    try {
      await articlesApi.remove(deleting.id);
      notify.success('Articulo eliminado');
      setDeleting(null);
      reload();
    } catch(err) { notify.error(err.message); }
  };

  return (
    <div style={{ padding:'20px 16px', maxWidth:1100, margin:'0 auto' }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12, marginBottom:20 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <Package size={26} color="#E8551C" />
          <div>
            <h1 style={{ fontSize:20, fontWeight:700, margin:0, color:C.text }}>Inventario</h1>
            <p style={{ fontSize:13, color:C.muted, margin:0 }}>{articles.length} articulos registrados</p>
          </div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          {hasPermission('articles.create') && (
            <button onClick={() => setBulkOpen(true)} style={{ display:'flex', alignItems:'center', gap:6, background:C.dark, color:C.text, border:'1px solid '+C.border, borderRadius:8, padding:'9px 16px', fontWeight:600, cursor:'pointer', fontSize:13 }}>
              <Upload size={16} /> Carga masiva
            </button>
          )}
          {hasPermission('articles.create') && (
            <button onClick={() => navigate('/inventario/nuevo')} style={{ display:'flex', alignItems:'center', gap:6, background:C.orange, color:'#fff', border:'none', borderRadius:8, padding:'9px 16px', fontWeight:600, cursor:'pointer', fontSize:13 }}>
              <Plus size={16} /> Nuevo articulo
            </button>
          )}
        </div>
      </div>

      {/* Filtros */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 200px 200px', gap:10, marginBottom:16 }}>
        <div style={{ position:'relative' }}>
          <Search size={15} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:C.muted }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por codigo o nombre..." style={{ ...inp, width:'100%', paddingLeft:32, boxSizing:'border-box' }} />
        </div>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={{ ...inp, cursor:'pointer' }}>
          <option value=''>Todos los tipos</option>
          {types.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <select value={warehouseFilter} onChange={e => setWarehouseFilter(e.target.value)} style={{ ...inp, cursor:'pointer' }}>
          <option value=''>Todas las bodegas</option>
          {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>
      </div>

      {/* Tabla */}
      <div style={{ background:C.card, border:'1px solid '+C.border, borderRadius:12, overflow:'hidden' }}>
        <div style={{ display:'grid', gridTemplateColumns:'50px 100px 1fr 120px 140px 100px 100px 100px', background:C.dark, padding:'10px 16px', borderBottom:'1px solid '+C.border }}>
          {['','Codigo','Nombre','Tipo','Bodega','Cantidad','Precio','Acciones'].map((h,i) => (
            <span key={i} style={{ fontSize:11, fontWeight:800, color:C.muted, textTransform:'uppercase', letterSpacing:'.6px', textAlign: i===7?'right':'left' }}>{h}</span>
          ))}
        </div>
        {loading ? (
          <p style={{ color:C.muted, textAlign:'center', padding:40 }}>Cargando...</p>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign:'center', padding:'48px 0', color:C.muted }}>
            <Package size={48} style={{ opacity:.3, marginBottom:12 }} />
            <p>No hay articulos. Crea uno nuevo o usa la carga masiva.</p>
          </div>
        ) : filtered.map(a => (
          <div key={a.id} style={{ display:'grid', gridTemplateColumns:'50px 100px 1fr 120px 140px 100px 100px 100px', padding:'12px 16px', borderBottom:'1px solid '+C.border, alignItems:'center' }}>
            <div><Thumb url={a.image_url} name={a.name} /></div>
            <span style={{ fontSize:12, fontFamily:'monospace', color:C.muted }}>{a.code}</span>
            <span style={{ fontWeight:600, color:C.text }}>{a.name}</span>
            <span style={{ background:C.orange+'22', color:C.orange, border:'1px solid '+C.orange+'44', borderRadius:20, padding:'2px 8px', fontSize:11, fontWeight:600, width:'fit-content' }}>{a.type_name}</span>
            <span style={{ fontSize:13, color:C.muted }}>{a.warehouse_name}</span>
            <span style={{ fontSize:13, color:C.text }}>{a.quantity} {a.unit}</span>
            <span style={{ fontSize:13, fontWeight:600, color:'#10b981' }}>Q {Number(a.price).toFixed(2)}</span>
            <div style={{ display:'flex', gap:6, justifyContent:'flex-end' }}>
              <button onClick={() => setViewing(a)} style={{ background:C.dark, border:'1px solid '+C.border, borderRadius:6, padding:'5px 8px', cursor:'pointer', color:C.muted }}><Eye size={14}/></button>
              {hasPermission('articles.update') && <button onClick={() => navigate(`/inventario/${a.id}/editar`)} style={{ background:C.dark, border:'1px solid '+C.border, borderRadius:6, padding:'5px 8px', cursor:'pointer', color:C.muted }}><Pencil size={14}/></button>}
              {hasPermission('articles.delete') && <button onClick={() => setDeleting(a)} style={{ background:'#ef444415', border:'1px solid #ef444440', borderRadius:6, padding:'5px 8px', cursor:'pointer', color:'#ef4444' }}><Trash2 size={14}/></button>}
            </div>
          </div>
        ))}
      </div>

      <BulkUploadModal open={bulkOpen} onClose={() => setBulkOpen(false)} onDone={reload} />
      <ArticleViewModal open={Boolean(viewing)} onClose={() => setViewing(null)} article={viewing} />
      <ConfirmDialog open={Boolean(deleting)} onClose={() => setDeleting(null)} onConfirm={handleDelete}
        title="Eliminar articulo" message={`Se eliminara "${deleting?.name}". Esta accion no se puede deshacer.`} confirmText="Eliminar" />
    </div>
  );
}
