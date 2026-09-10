// ============================================================================
// PANTALLA: Clientes
// Se accede desde el menú "Clientes" (/clientes). Muestra la lista completa
// de clientes del taller con búsqueda y filtros (por tipo de cliente y por
// estado de validación). Desde aquí se puede:
//   - Crear un cliente nuevo (ventana ClientFormModal).
//   - Ver el detalle completo de un cliente (ventana ClientViewModal).
//   - Editar un cliente existente.
//   - Eliminarlo (pide confirmación antes de borrar).
//   - Marcar como "Validado" a un cliente que quedó pendiente (por ejemplo,
//     los que se dieron de alta rápida desde otra pantalla).
// En pantallas angostas (celular) se muestra como tarjetas en vez de tabla.
// ============================================================================
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Pencil, Trash2, Search, Eye, Contact, Check, Clock, History } from 'lucide-react';
import { useClients } from '../../hooks/useClients.js';
import { useClientTypes } from '../../hooks/useClientTypes.js';
import { useLoyaltyTiers } from '../../hooks/useLoyaltyTiers.js';
import { useAuth } from '../../hooks/useAuth.js';
import { clientsApi } from '../../api/clientsApi.js';
import { notify } from '../../lib/toast.js';
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx';
import Combobox from '../../components/ui/Combobox.jsx';
import Table from '../../components/ui/Table.jsx';
import ClientFormModal from './ClientFormModal.jsx';
import ClientViewModal from './ClientViewModal.jsx';
import { useIsMobile } from '../../hooks/useIsMobile.js';

const C = { bg:'var(--c-app)', card:'var(--c-surface)', dark:'var(--c-surface-2)', border:'var(--c-line)', input:'var(--c-surface-2)', text:'var(--c-text)', muted:'var(--c-muted)', orange:'#CA8A04' };
const inp = { background:C.input, border:'1px solid '+C.border, color:C.text, padding:'8px 10px', borderRadius:6, fontSize:13, outline:'none' };

export default function ClientsPage() {
  const navigate = useNavigate();
  const { clients, loading, reload } = useClients();
  const { types } = useClientTypes();
  const { tiers } = useLoyaltyTiers();
  const { hasPermission } = useAuth();
  const isMobile = useIsMobile();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [validationFilter, setValidationFilter] = useState(''); // '' | 'pending' | 'validated'
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  // Cuenta cuántos clientes están pendientes de validación (se muestra en
  // el encabezado de la pantalla).
  const pendingCount = useMemo(() => clients.filter(c => c.is_validated === 0).length, [clients]);

  // Aplica el texto de búsqueda y los filtros de tipo/validación sobre la
  // lista completa de clientes, para decidir cuáles se muestran.
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return clients.filter(c => {
      if (typeFilter && c.client_type_id !== Number(typeFilter)) return false;
      if (validationFilter === 'pending' && c.is_validated !== 0) return false;
      if (validationFilter === 'validated' && c.is_validated === 0) return false;
      if (q && !`${c.full_name} ${c.nit} ${c.dpi} ${c.phone} ${c.email}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [clients, search, typeFilter, validationFilter]);

  // Abre la ventana de formulario en modo "crear" (sin cliente precargado).
  const openCreate = () => { setEditing(null); setFormOpen(true); };
  // Abre la ventana de formulario en modo "editar", con los datos del
  // cliente seleccionado ya cargados.
  const openEdit = (c) => { setEditing(c); setFormOpen(true); };
  // Se llama cuando el formulario terminó de guardar: cierra la ventana y
  // vuelve a cargar la lista para reflejar el cambio.
  const handleSaved = () => { setFormOpen(false); reload(); };
  // Elimina definitivamente al cliente que se confirmó borrar.
  const handleDelete = async () => {
    try {
      await clientsApi.remove(deleting.id);
      notify.success('Cliente eliminado');
      setDeleting(null);
      reload();
    } catch(err) { notify.error(err.message); }
  };
  // Marca a un cliente pendiente como "validado" (un administrador confirma
  // que sus datos son correctos).
  const handleValidate = async (c) => {
    try {
      await clientsApi.validate(c.id);
      notify.success('Cliente validado');
      reload();
    } catch(err) { notify.error(err.message); }
  };

  // Estilo comun de los botones de accion de cada fila/tarjeta. `size` es el
  // area tactil: mas grande en celular para poder tocarlo con el dedo.
  const actionBtn = (color, big) => ({
    display:'inline-flex', alignItems:'center', justifyContent:'center',
    background:C.dark, border:'1px solid '+C.border, borderRadius:7,
    width: big ? 38 : 32, height: big ? 38 : 32,
    cursor:'pointer', color, flexShrink:0,
  });
  const dangerBtn = (big) => ({ ...actionBtn('#ef4444', big), background:'#ef444415', border:'1px solid #ef444440' });

  // Los cuatro botones de accion de un cliente (se usan igual en la tabla de
  // escritorio y en las tarjetas de celular, solo cambia el tamano).
  const renderActions = (c, big = false) => (
    <>
      <button onClick={() => setViewing(c)} title="Ver ficha" style={actionBtn(C.muted, big)}><Eye size={big?16:14}/></button>
      <button onClick={() => navigate('/clientes/'+c.id+'/historial')} title="Ver historial" style={actionBtn(C.orange, big)}><History size={big?16:14}/></button>
      {hasPermission('clients.update') && (
        <button onClick={() => openEdit(c)} title="Editar cliente" style={actionBtn(C.muted, big)}><Pencil size={big?16:14}/></button>
      )}
      {hasPermission('clients.delete') && (
        <button onClick={() => setDeleting(c)} title="Eliminar cliente" style={dangerBtn(big)}><Trash2 size={big?16:14}/></button>
      )}
    </>
  );

  // Distintivo del estado de validacion: boton "Validar" para pendientes (con
  // permiso), o un badge de solo lectura (Pendiente / Validado).
  const renderValidation = (c) => {
    if (c.is_validated === 0) {
      if (hasPermission('clients.validate')) {
        return (
          <button onClick={() => handleValidate(c)} title="Marcar como validado"
            style={{ display:'inline-flex', alignItems:'center', gap:4, background:'#f59e0b22', color:'#d97706', border:'1px solid #f59e0b66', borderRadius:20, padding:'2px 8px', fontSize:11, fontWeight:700, cursor:'pointer', width:'fit-content' }}>
            <Check size={12}/> Validar
          </button>
        );
      }
      return (
        <span style={{ display:'inline-flex', alignItems:'center', gap:4, background:'#f59e0b22', color:'#d97706', border:'1px solid #f59e0b55', borderRadius:20, padding:'2px 8px', fontSize:11, fontWeight:600, width:'fit-content' }}>
          <Clock size={11}/> Pendiente
        </span>
      );
    }
    return (
      <span style={{ display:'inline-flex', alignItems:'center', gap:4, background:'#10b98118', color:'#10b981', border:'1px solid #10b98140', borderRadius:20, padding:'2px 8px', fontSize:11, fontWeight:600, width:'fit-content' }}>
        <Check size={11}/> Validado
      </span>
    );
  };

  return (
    <div style={{ padding:'20px 16px', maxWidth:1100, margin:'0 auto' }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12, marginBottom:20 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <Contact size={26} color="var(--c-accent)" />
          <div>
            <h1 style={{ fontSize:20, fontWeight:700, margin:0, color:C.text }}>Clientes</h1>
            <p style={{ fontSize:13, color:C.muted, margin:0 }}>
              {clients.length} clientes registrados{pendingCount > 0 ? ` · ${pendingCount} pendiente${pendingCount > 1 ? 's' : ''} de validación` : ''}
            </p>
          </div>
        </div>
        {hasPermission('clients.create') && (
          <button onClick={openCreate} style={{ display:'flex', alignItems:'center', gap:6, background:C.orange, color:'#fff', border:'none', borderRadius:8, padding:'9px 16px', fontWeight:600, cursor:'pointer', fontSize:13 }}>
            <Plus size={16} /> Nuevo cliente
          </button>
        )}
      </div>

      {/* Filtros */}
      <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 200px 200px', gap:10, marginBottom:16 }}>
        <div style={{ position:'relative' }}>
          <Search size={15} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:C.muted }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nombre, NIT, DPI..." style={{ ...inp, width:'100%', paddingLeft:32, boxSizing:'border-box' }} />
        </div>
        <Combobox value={typeFilter} onChange={setTypeFilter}
          options={[{ value:'', label:'Todos los tipos' }, ...types.map(t => ({ value:t.id, label:t.name }))]} />
        <Combobox value={validationFilter} onChange={setValidationFilter}
          options={[{ value:'', label:'Validados y pendientes' }, { value:'pending', label:'Solo pendientes' }, { value:'validated', label:'Solo validados' }]} />
      </div>

      {/* Tabla Desktop.
          Usa el componente Table (celdas de tabla reales): antes era una
          cuadricula CSS con columnas de ancho fijo, y los 4 botones de accion no
          caben en 100px -- se salian de su columna y quedaban encima de los
          distintivos de "Estado". Con celdas reales eso no puede pasar, y si la
          ventana es angosta la tabla se desplaza en horizontal en vez de
          amontonar el contenido. */}
      {!isMobile && (
        <Table
          data={filtered}
          loading={loading}
          emptyMessage="No hay clientes que coincidan con la busqueda."
          columns={[
            {
              key: 'full_name',
              header: 'Nombre',
              className: 'min-w-[200px]',
              render: (c) => (
                <div>
                  <p style={{ margin:0, fontWeight:600, color:C.text, fontSize:14 }}>{c.full_name}</p>
                  {c.email && <p style={{ margin:0, fontSize:12, color:C.muted }}>{c.email}</p>}
                </div>
              ),
            },
            {
              key: 'doc',
              header: 'NIT / DPI',
              className: 'whitespace-nowrap',
              render: (c) => (
                <span style={{ fontSize:12, fontFamily:'monospace', color:C.muted }}>{c.nit || c.dpi || '—'}</span>
              ),
            },
            {
              key: 'phone',
              header: 'Telefono',
              className: 'whitespace-nowrap',
              render: (c) => <span style={{ fontSize:13, color:C.text }}>{c.phone || '—'}</span>,
            },
            {
              key: 'client_type_name',
              header: 'Tipo',
              render: (c) => (
                <span style={{ display:'inline-block', whiteSpace:'nowrap', background:C.orange+'22', color:C.orange, border:'1px solid '+C.orange+'44', borderRadius:20, padding:'2px 8px', fontSize:11, fontWeight:600 }}>
                  {c.client_type_name || '—'}
                </span>
              ),
            },
            {
              key: 'status',
              header: 'Estado',
              render: (c) => (
                <div style={{ display:'flex', flexDirection:'column', gap:4, alignItems:'flex-start' }}>
                  <span style={{ whiteSpace:'nowrap', background: c.is_active ? '#10b98122':'#ef444422', color: c.is_active ? '#10b981':'#ef4444', border:'1px solid '+(c.is_active?'#10b98144':'#ef444444'), borderRadius:20, padding:'2px 8px', fontSize:11, fontWeight:600 }}>
                    {c.is_active ? 'Activo' : 'Inactivo'}
                  </span>
                  {renderValidation(c)}
                </div>
              ),
            },
          ]}
          renderActions={(c) => renderActions(c)}
        />
      )}

      {/* Cards Mobile */}
      {isMobile && (
        <div style={{ background:C.card, border:'1px solid '+C.border, borderRadius:12, overflow:'hidden' }}>
          {loading ? (
            <p style={{ color:C.muted, textAlign:'center', padding:40 }}>Cargando...</p>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign:'center', padding:'48px 0', color:C.muted }}>
              <span style={{ fontSize:48, opacity:.3 }}>👥</span>
              <p>No hay clientes registrados</p>
            </div>
          ) : filtered.map(c => (
            /* Tarjeta de celular: primero los datos (a todo el ancho, sin que
               los botones le roben espacio al nombre) y abajo la fila de
               acciones, alineada a la derecha y con botones grandes. */
            <div key={c.id} style={{ padding:'14px 16px', borderBottom:'1px solid '+C.border }}>
              <p style={{ margin:0, fontWeight:700, color:C.text, fontSize:15, wordBreak:'break-word' }}>{c.full_name}</p>
              {c.email && <p style={{ margin:'2px 0', fontSize:12, color:C.muted, wordBreak:'break-word' }}>{c.email}</p>}
              <p style={{ margin:'2px 0', fontSize:12, color:C.muted }}>{c.phone || '—'} · {c.nit || c.dpi || '—'}</p>
              <div style={{ display:'flex', gap:6, marginTop:8, flexWrap:'wrap' }}>
                <span style={{ background:C.orange+'22', color:C.orange, border:'1px solid '+C.orange+'44', borderRadius:20, padding:'2px 8px', fontSize:11, fontWeight:600 }}>{c.client_type_name || '—'}</span>
                <span style={{ background: c.is_active ? '#10b98122':'#ef444422', color: c.is_active ? '#10b981':'#ef4444', border:'1px solid '+(c.is_active?'#10b98144':'#ef444444'), borderRadius:20, padding:'2px 8px', fontSize:11, fontWeight:600 }}>
                  {c.is_active ? 'Activo' : 'Inactivo'}
                </span>
                {renderValidation(c)}
              </div>
              <div style={{ display:'flex', gap:8, marginTop:12, justifyContent:'flex-end', flexWrap:'wrap' }}>
                {renderActions(c, true)}
              </div>
            </div>
          ))}
        </div>
      )}

      <ClientFormModal open={formOpen} onClose={() => setFormOpen(false)} onSaved={handleSaved} client={editing} clientTypes={types} loyaltyTiers={tiers} />
      <ClientViewModal open={Boolean(viewing)} onClose={() => setViewing(null)} client={viewing} />
      <ConfirmDialog open={Boolean(deleting)} onClose={() => setDeleting(null)} onConfirm={handleDelete}
        title="Eliminar cliente" message={`Se eliminara a "${deleting?.full_name}". Esta accion no se puede deshacer.`} confirmText="Eliminar" />
    </div>
  );
}