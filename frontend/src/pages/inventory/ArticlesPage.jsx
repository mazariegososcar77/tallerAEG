import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Pencil, Trash2, Upload, Package, Search, Eye } from 'lucide-react';
import { useArticles } from '../../hooks/useArticles.js';
import { useArticleTypes } from '../../hooks/useArticleTypes.js';
import { useWarehouses } from '../../hooks/useWarehouses.js';
import { useAuth } from '../../hooks/useAuth.js';
import { articlesApi } from '../../api/articlesApi.js';
import { notify } from '../../lib/toast.js';
import PageHeader from '../../components/common/PageHeader.jsx';
import Button from '../../components/ui/Button.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Table from '../../components/ui/Table.jsx';
import Input from '../../components/ui/Input.jsx';
import Select from '../../components/ui/Select.jsx';
import ColorDot from '../../components/ui/ColorDot.jsx';
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx';
import BulkUploadModal from './BulkUploadModal.jsx';
import ArticleViewModal from './ArticleViewModal.jsx';

function Thumb({ url, name }) {
  const [broken, setBroken] = useState(false);
  if (!url || broken) {
    return (
      <div className="flex h-10 w-10 items-center justify-center rounded border border-slate-200 bg-slate-50 text-slate-300">
        <Package size={18} />
      </div>
    );
  }
  return (
    <img
      src={url}
      alt={name}
      className="h-10 w-10 rounded border border-slate-200 object-cover"
      onError={() => setBroken(true)}
    />
  );
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

  const canCreate = hasPermission('articles.create');
  const canUpdate = hasPermission('articles.update');
  const canDelete = hasPermission('articles.delete');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return articles.filter((a) => {
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
    } catch (err) {
      notify.error(err.message);
    }
  };

  const columns = [
    { key: 'image_url', header: '', render: (a) => <Thumb url={a.image_url} name={a.name} /> },
    { key: 'code', header: 'Codigo', render: (a) => <span className="font-mono text-xs">{a.code}</span> },
    { key: 'name', header: 'Nombre', render: (a) => <span className="font-medium text-navy-800">{a.name}</span> },
    { key: 'type_name', header: 'Tipo', render: (a) => <Badge variant="navy">{a.type_name}</Badge> },
    {
      key: 'warehouse_name',
      header: 'Bodega',
      render: (a) => (
        <span className="inline-flex items-center gap-2">
          <ColorDot color={a.warehouse_color} />
          {a.warehouse_name}
        </span>
      ),
    },
    { key: 'quantity', header: 'Cantidad', render: (a) => `${a.quantity} ${a.unit}` },
    { key: 'price', header: 'Precio', render: (a) => `Q ${Number(a.price).toFixed(2)}` },
  ];

  const typeOptions = [{ value: '', label: 'Todos los tipos' }, ...types.map((t) => ({ value: t.id, label: t.name }))];
  const warehouseOptions = [
    { value: '', label: 'Todas las bodegas' },
    ...warehouses.map((w) => ({
      value: w.id,
      label: (
        <span className="inline-flex items-center gap-2">
          <ColorDot color={w.color} />
          {w.name}
        </span>
      ),
    })),
  ];

  return (
    <div>
      <PageHeader title="Inventario" subtitle="Articulos registrados">
        {canCreate && (
          <>
            <Button variant="outline" onClick={() => setBulkOpen(true)}>
              <Upload size={16} /> Carga masiva
            </Button>
            <Button onClick={() => navigate('/inventario/nuevo')}>
              <Plus size={16} /> Nuevo articulo
            </Button>
          </>
        )}
      </PageHeader>

      {/* Filtros */}
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
          <Input
            className="[&>input]:pl-9"
            placeholder="Buscar por codigo o nombre..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={typeFilter} onChange={setTypeFilter} options={typeOptions} />
        <Select value={warehouseFilter} onChange={setWarehouseFilter} options={warehouseOptions} />
      </div>

      <Table
        columns={columns}
        data={filtered}
        loading={loading}
        emptyMessage="No hay articulos. Crea uno nuevo o usa la carga masiva."
        renderActions={(article) => (
          <>
            <Button variant="ghost" size="sm" title="Visualizar" onClick={() => setViewing(article)}>
              <Eye size={16} />
            </Button>
            {canUpdate && (
              <Button variant="ghost" size="sm" title="Editar"
                onClick={() => navigate(`/inventario/${article.id}/editar`)}>
                <Pencil size={16} />
              </Button>
            )}
            {canDelete && (
              <Button variant="ghost" size="sm" title="Eliminar"
                className="text-red-600 hover:bg-red-50" onClick={() => setDeleting(article)}>
                <Trash2 size={16} />
              </Button>
            )}
          </>
        )}
      />

      <BulkUploadModal open={bulkOpen} onClose={() => setBulkOpen(false)} onDone={reload} />

      <ArticleViewModal open={Boolean(viewing)} onClose={() => setViewing(null)} article={viewing} />

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        title="Eliminar articulo"
        message={`Se eliminara "${deleting?.name}". Esta accion no se puede deshacer.`}
        confirmText="Eliminar"
      />
    </div>
  );
}
