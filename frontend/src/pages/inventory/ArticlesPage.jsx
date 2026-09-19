// PANTALLA: Lista de Inventario. Muestra todos los artículos registrados con su
// foto, código, nombre, tipo, bodega, cantidad y precio. Desde aquí se puede
// buscar, filtrar por tipo o bodega, ver el detalle de un artículo, editarlo,
// eliminarlo, crear uno nuevo o subir varios de una vez con un archivo de Excel
// (carga masiva).
import { useState, useMemo, useEffect, Fragment } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Pencil, Trash2, Upload, Package, Search, Eye } from 'lucide-react';
import { useArticles } from '../../hooks/useArticles.js';
import { useArticleTypes } from '../../hooks/useArticleTypes.js';
import { useWarehouses } from '../../hooks/useWarehouses.js';
import { useAuth } from '../../hooks/useAuth.js';
import { useIsMobile } from '../../hooks/useIsMobile.js';
import { articlesApi } from '../../api/articlesApi.js';
import { notify } from '../../lib/toast.js';
import { formatCurrency } from '../../lib/currency.js';
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx';
import Combobox from '../../components/ui/Combobox.jsx';
import CurrencyInput from '../../components/ui/CurrencyInput.jsx';
import BulkUploadModal from './BulkUploadModal.jsx';
import ArticleViewModal from './ArticleViewModal.jsx';

const C = { bg:'var(--c-app)', card:'var(--c-surface)', dark:'var(--c-surface-2)', border:'var(--c-line)', input:'var(--c-surface-2)', text:'var(--c-text)', muted:'var(--c-muted)', orange:'#CA8A04' };
const inp = { background:C.input, border:'1px solid '+C.border, color:C.text, padding:'8px 10px', borderRadius:6, fontSize:13, outline:'none' };

// Muestra la fotito del articulo; si no tiene imagen o no carga, pone un icono de caja.
function Thumb({ url, name }) {
  const [broken, setBroken] = useState(false);
  if (!url || broken) return (
    <div style={{ width:38, height:38, borderRadius:6, background:C.dark, border:'1px solid '+C.border, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <Package size={16} color={C.muted} />
    </div>
  );
  return <img src={url} alt={name} onError={() => setBroken(true)} style={{ width:38, height:38, borderRadius:6, objectFit:'cover', border:'1px solid '+C.border }} />;
}

// Precio de venta editable directo en la lista (sin entrar a "Editar articulo"):
// si el usuario tiene permiso, muestra un campo con formato de moneda que guarda
// solo, al salir del campo (onBlur) y solo si el valor realmente cambio. Sin
// permiso, se ve igual que antes: texto de solo lectura.
function InlinePrice({ article, editable, onCommit, style }) {
  const [draft, setDraft] = useState(article.price);
  useEffect(() => { setDraft(article.price); }, [article.price]);

  if (!editable) {
    return <span style={style}>{formatCurrency(article.price)}</span>;
  }
  return (
    <CurrencyInput
      value={draft}
      onChange={e => setDraft(e.target.value)}
      onBlur={() => { if (Number(draft) !== Number(article.price)) onCommit(article, draft); }}
      style={{ background:'transparent', border:'1px solid transparent', borderRadius:6, padding:'2px 6px', outline:'none', width:90, ...style }}
    />
  );
}

export default function ArticlesPage() {
  const navigate = useNavigate();
  const { articles, loading, reload } = useArticles();
  const { types } = useArticleTypes();
  const { warehouses } = useWarehouses();
  const { hasPermission } = useAuth();
  const isMobile = useIsMobile();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('');
  const [bulkOpen, setBulkOpen] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [viewing, setViewing] = useState(null);

  // Filtra la lista de articulos segun lo que el usuario busco y los filtros
  // de tipo/bodega que haya elegido. Se recalcula solo cuando cambia algo de eso.
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return articles.filter(a => {
      if (typeFilter && a.type_id !== Number(typeFilter)) return false;
      if (warehouseFilter && a.warehouse_id !== Number(warehouseFilter)) return false;
      if (q && !`${a.code} ${a.name}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [articles, search, typeFilter, warehouseFilter]);

  // Agrupa los articulos ya filtrados por su Tipo, en el mismo orden del
  // catalogo de tipos (no alfabetico). Los que quedaron sin tipo valido (dato
  // viejo, o el tipo se elimino) caen en un grupo aparte al final, en vez de
  // desaparecer de la lista.
  const grouped = useMemo(() => {
    const byType = new Map(types.map(t => [t.id, { type:t, items:[] }]));
    const sinTipo = { type:null, items:[] };
    for (const a of filtered) {
      const g = byType.get(a.type_id);
      (g || sinTipo).items.push(a);
    }
    const groups = types.map(t => byType.get(t.id)).filter(g => g.items.length > 0);
    if (sinTipo.items.length > 0) groups.push(sinTipo);
    return groups;
  }, [filtered, types]);

  // Elimina el articulo seleccionado (despues de confirmar en el dialogo) y recarga la lista.
  const handleDelete = async () => {
    try {
      await articlesApi.remove(deleting.id);
      notify.success('Articulo eliminado');
      setDeleting(null);
      reload();
    } catch(err) { notify.error(err.message); }
  };

  // Guarda el precio editado directo desde la lista (sin abrir "Editar articulo").
  const handlePriceCommit = async (article, rawValue) => {
    const price = Number(rawValue) || 0;
    try {
      await articlesApi.update(article.id, { price });
      notify.success(`Precio de "${article.name}" actualizado`);
      reload();
    } catch (err) {
      notify.error(err.response?.data?.message || err.message || 'No se pudo actualizar el precio');
      reload(); // revierte el campo al valor real guardado
    }
  };

  return (
    <div style={{ padding:'20px 16px', maxWidth:1100, margin:'0 auto' }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12, marginBottom:20 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <Package size={26} color="var(--c-accent)" />
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

      {/* Filtros: buscar por texto, o filtrar por tipo y por bodega */}
      <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 200px 200px', gap:10, marginBottom:16 }}>
        <div style={{ position:'relative' }}>
          <Search size={15} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:C.muted }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por codigo o nombre..." style={{ ...inp, width:'100%', paddingLeft:32, boxSizing:'border-box' }} />
        </div>
        <Combobox value={typeFilter} onChange={setTypeFilter}
          options={[{ value:'', label:'Todos los tipos' }, ...types.map(t => ({ value:t.id, label:t.name }))]} />
        <Combobox value={warehouseFilter} onChange={setWarehouseFilter}
          options={[{ value:'', label:'Todas las bodegas' }, ...warehouses.map(w => ({ value:w.id, label:w.name }))]} />
      </div>

      {/* Tabla para pantallas grandes (computadora) */}
      {!isMobile && (
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
              <Package size={48} style={{ opacity:.3, margin:'0 auto 12px' }} />
              <p>No hay articulos. Crea uno nuevo o usa la carga masiva.</p>
            </div>
          ) : grouped.map(g => (
            <Fragment key={g.type?.id ?? 'sin-tipo'}>
              <div style={{ padding:'7px 16px', background:C.bg, borderBottom:'1px solid '+C.border, display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ fontSize:11, fontWeight:800, color:C.orange, textTransform:'uppercase', letterSpacing:'.6px' }}>{g.type?.name || 'Sin tipo'}</span>
                <span style={{ fontSize:11, color:C.muted }}>({g.items.length})</span>
              </div>
              {g.items.map(a => (
                <div key={a.id} style={{ display:'grid', gridTemplateColumns:'50px 100px 1fr 120px 140px 100px 100px 100px', padding:'12px 16px', borderBottom:'1px solid '+C.border, alignItems:'center' }}>
                  <div><Thumb url={a.image_display_url} name={a.name} /></div>
                  <span style={{ fontSize:12, fontFamily:'monospace', color:C.muted }}>{a.code}</span>
                  <span style={{ fontWeight:600, color:C.text }}>{a.name}</span>
                  <span style={{ background:C.orange+'22', color:C.orange, border:'1px solid '+C.orange+'44', borderRadius:20, padding:'2px 8px', fontSize:11, fontWeight:600, width:'fit-content' }}>{a.type_name}</span>
                  <span style={{ fontSize:13, color:C.muted }}>{a.warehouse_name}</span>
                  <span style={{ fontSize:13, color:C.text }}>{a.quantity} {a.unit}</span>
                  <InlinePrice article={a} editable={hasPermission('articles.update')} onCommit={handlePriceCommit} style={{ fontSize:13, fontWeight:600, color:'#10b981', textAlign:'right' }} />
                  <div style={{ display:'flex', gap:6, justifyContent:'flex-end' }}>
                    <button onClick={() => setViewing(a)} title="Ver detalle" style={{ background:C.dark, border:'1px solid '+C.border, borderRadius:6, padding:'5px 8px', cursor:'pointer', color:C.muted }}><Eye size={14}/></button>
                    {hasPermission('articles.update') && <button onClick={() => navigate(`/inventario/${a.id}/editar`)} title="Editar" style={{ background:C.dark, border:'1px solid '+C.border, borderRadius:6, padding:'5px 8px', cursor:'pointer', color:C.muted }}><Pencil size={14}/></button>}
                    {hasPermission('articles.delete') && <button onClick={() => setDeleting(a)} title="Eliminar" style={{ background:'#ef444415', border:'1px solid #ef444440', borderRadius:6, padding:'5px 8px', cursor:'pointer', color:'#ef4444' }}><Trash2 size={14}/></button>}
                  </div>
                </div>
              ))}
            </Fragment>
          ))}
        </div>
      )}

      {/* Version en tarjetas para pantallas de celular (misma informacion, otro formato) */}
      {isMobile && (
        <div style={{ background:C.card, border:'1px solid '+C.border, borderRadius:12, overflow:'hidden' }}>
          {loading ? (
            <p style={{ color:C.muted, textAlign:'center', padding:40 }}>Cargando...</p>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign:'center', padding:'48px 0', color:C.muted }}>
              <Package size={48} style={{ opacity:.3, margin:'0 auto 12px' }} />
              <p>No hay articulos. Crea uno nuevo o usa la carga masiva.</p>
            </div>
          ) : grouped.map(g => (
            <Fragment key={g.type?.id ?? 'sin-tipo'}>
              <div style={{ padding:'7px 16px', background:C.bg, borderBottom:'1px solid '+C.border, display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ fontSize:11, fontWeight:800, color:C.orange, textTransform:'uppercase', letterSpacing:'.6px' }}>{g.type?.name || 'Sin tipo'}</span>
                <span style={{ fontSize:11, color:C.muted }}>({g.items.length})</span>
              </div>
              {g.items.map(a => (
                <div key={a.id} style={{ display:'flex', gap:12, padding:'14px 16px', borderBottom:'1px solid '+C.border }}>
                  <Thumb url={a.image_display_url} name={a.name} />
                  <div style={{ flex:1, minWidth:0 }}>
                    <p style={{ margin:0, fontWeight:700, color:C.text, fontSize:14 }}>{a.name}</p>
                    <p style={{ margin:'2px 0', fontSize:12, fontFamily:'monospace', color:C.muted }}>{a.code}</p>
                    <p style={{ margin:'2px 0', fontSize:12, color:C.muted }}>{a.warehouse_name || '—'} · {a.quantity} {a.unit}</p>
                    <InlinePrice article={a} editable={hasPermission('articles.update')} onCommit={handlePriceCommit} style={{ fontSize:13, fontWeight:700, color:'#10b981' }} />
                    <div style={{ display:'flex', gap:6, marginTop:6, flexWrap:'wrap' }}>
                      {a.type_name && <span style={{ background:C.orange+'22', color:C.orange, border:'1px solid '+C.orange+'44', borderRadius:20, padding:'2px 8px', fontSize:11, fontWeight:600 }}>{a.type_name}</span>}
                    </div>
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                    <button onClick={() => setViewing(a)} title="Ver detalle" style={{ background:C.dark, border:'1px solid '+C.border, borderRadius:6, padding:'8px 10px', cursor:'pointer', color:C.muted }}><Eye size={15}/></button>
                    {hasPermission('articles.update') && <button onClick={() => navigate(`/inventario/${a.id}/editar`)} title="Editar" style={{ background:C.dark, border:'1px solid '+C.border, borderRadius:6, padding:'8px 10px', cursor:'pointer', color:C.muted }}><Pencil size={15}/></button>}
                    {hasPermission('articles.delete') && <button onClick={() => setDeleting(a)} title="Eliminar" style={{ background:'#ef444415', border:'1px solid #ef444440', borderRadius:6, padding:'8px 10px', cursor:'pointer', color:'#ef4444' }}><Trash2 size={15}/></button>}
                  </div>
                </div>
              ))}
            </Fragment>
          ))}
        </div>
      )}

      <BulkUploadModal open={bulkOpen} onClose={() => setBulkOpen(false)} onDone={reload} />
      <ArticleViewModal open={Boolean(viewing)} onClose={() => setViewing(null)} article={viewing} />
      <ConfirmDialog open={Boolean(deleting)} onClose={() => setDeleting(null)} onConfirm={handleDelete}
        title="Eliminar articulo" message={`Se eliminara "${deleting?.name}". Esta accion no se puede deshacer.`} confirmText="Eliminar" />
    </div>
  );
}
