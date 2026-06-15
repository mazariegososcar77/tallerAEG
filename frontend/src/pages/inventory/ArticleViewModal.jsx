import { useState, useEffect } from 'react';
import { Package, Info, Boxes, Wrench } from 'lucide-react';
import Modal from '../../components/ui/Modal.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import Tabs from '../../components/ui/Tabs.jsx';

function Field({ label, children }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted">{label}</dt>
      <dd className="mt-0.5 text-navy-800">{children}</dd>
    </div>
  );
}

/** Lista de solo lectura con numeracion. Hace scroll al superar 10 items. */
function ReadOnlyList({ items, emptyIcon, emptyText }) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-slate-200 py-12 text-muted">
        {emptyIcon}
        <p className="text-sm">{emptyText}</p>
      </div>
    );
  }
  return (
    <ul className={`space-y-1.5 ${items.length > 10 ? 'max-h-[26rem] overflow-y-auto pr-1' : ''}`}>
      {items.map((item, i) => (
        <li
          key={item.id ?? i}
          className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-navy-800"
        >
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-navy-100 text-xs font-semibold text-navy-700">
            {i + 1}
          </span>
          {item.name}
        </li>
      ))}
    </ul>
  );
}

/** Modal de solo lectura con la info del articulo, sus piezas y mano de obra, en pestañas. */
export default function ArticleViewModal({ open, onClose, article }) {
  const [broken, setBroken] = useState(false);
  const [tab, setTab] = useState('info');

  useEffect(() => {
    setBroken(false);
    setTab('info');
  }, [article?.id]);

  if (!article) return null;

  const pieces = article.pieces || [];
  const labor = article.labor || [];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Detalle del articulo"
      size="xl"
      accentColor={article.warehouse_color || '#16285C'}
      footer={
        <Button variant="outline" onClick={onClose}>
          Cerrar
        </Button>
      }
    >
      <Tabs
        className="mb-5"
        active={tab}
        onChange={setTab}
        tabs={[
          { key: 'info', label: 'Información', icon: <Info size={16} /> },
          { key: 'pieces', label: 'Piezas', icon: <Boxes size={16} />, count: pieces.length },
          { key: 'labor', label: 'Mano de obra', icon: <Wrench size={16} />, count: labor.length },
        ]}
      />

      <div className="min-h-[60vh]">
        {tab === 'info' && (
          <div className="grid gap-6 sm:grid-cols-[260px_1fr]">
            {/* Imagen */}
            <div className="flex h-64 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
              {article.image_url && !broken ? (
                <img
                  src={article.image_url}
                  alt={article.name}
                  className="h-full w-full object-contain"
                  onError={() => setBroken(true)}
                />
              ) : (
                <Package size={40} className="text-muted" />
              )}
            </div>

            {/* Informacion */}
            <div>
              <h4 className="text-xl font-bold text-navy-800">{article.name}</h4>
              <p className="font-mono text-xs text-slate-500">{article.code}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge variant="navy">{article.type_name}</Badge>
                {article.is_active ? (
                  <Badge variant="success">Activo</Badge>
                ) : (
                  <Badge variant="gray">Inactivo</Badge>
                )}
              </div>

              <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <Field label="Bodega">
                  <span className="inline-flex items-center gap-2">
                    <span
                      className="h-3 w-3 shrink-0 rounded-full border border-slate-200"
                      style={{ backgroundColor: article.warehouse_color || '#94a3b8' }}
                    />
                    {article.warehouse_name}
                  </span>
                </Field>
                <Field label="Cantidad">
                  {article.quantity} {article.unit}
                </Field>
                <Field label="Precio">Q {Number(article.price).toFixed(2)}</Field>
                <Field label="Marca">{article.brand || '—'}</Field>
                <Field label="Modelo">{article.model || '—'}</Field>
                <Field label="Ubicacion">{article.location || '—'}</Field>
              </dl>

              {article.description && (
                <div className="mt-4">
                  <dt className="text-xs font-medium uppercase tracking-wide text-muted">Descripcion</dt>
                  <dd className="mt-0.5 whitespace-pre-wrap text-sm text-navy-800">{article.description}</dd>
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'pieces' && (
          <ReadOnlyList
            items={pieces}
            emptyIcon={<Boxes size={32} />}
            emptyText="Este artículo no tiene piezas registradas."
          />
        )}

        {tab === 'labor' && (
          <ReadOnlyList
            items={labor}
            emptyIcon={<Wrench size={32} />}
            emptyText="Este artículo no tiene mano de obra registrada."
          />
        )}
      </div>
    </Modal>
  );
}
