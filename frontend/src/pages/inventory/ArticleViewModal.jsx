import { useState, useEffect } from 'react';
import { Package } from 'lucide-react';
import Modal from '../../components/ui/Modal.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';

function Field({ label, children }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="mt-0.5 text-navy-800">{children}</dd>
    </div>
  );
}

/** Modal de solo lectura con toda la info del articulo. Borde superior = color de la bodega. */
export default function ArticleViewModal({ open, onClose, article }) {
  const [broken, setBroken] = useState(false);

  useEffect(() => {
    setBroken(false);
  }, [article?.id]);

  if (!article) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Detalle del articulo"
      size="lg"
      accentColor={article.warehouse_color || '#16285C'}
      footer={
        <Button variant="outline" onClick={onClose}>
          Cerrar
        </Button>
      }
    >
      <div className="grid gap-5 sm:grid-cols-[210px_1fr]">
        {/* Imagen */}
        <div className="flex h-52 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
          {article.image_url && !broken ? (
            <img
              src={article.image_url}
              alt={article.name}
              className="h-full w-full object-contain"
              onError={() => setBroken(true)}
            />
          ) : (
            <Package size={40} className="text-slate-300" />
          )}
        </div>

        {/* Informacion */}
        <div>
          <h4 className="text-lg font-bold text-navy-800">{article.name}</h4>
          <p className="font-mono text-xs text-slate-500">{article.code}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge variant="navy">{article.type_name}</Badge>
            {article.is_active ? (
              <Badge variant="success">Activo</Badge>
            ) : (
              <Badge variant="gray">Inactivo</Badge>
            )}
          </div>

          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
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
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Descripcion</dt>
              <dd className="mt-0.5 whitespace-pre-wrap text-sm text-navy-800">{article.description}</dd>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
