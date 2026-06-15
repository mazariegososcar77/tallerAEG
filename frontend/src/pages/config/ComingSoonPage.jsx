import { Construction } from 'lucide-react';

/** Pagina placeholder para modulos aun no implementados. */
export default function ComingSoonPage({ icon: Icon = Construction, title, description }) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-center">
      <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-500">
        <Icon size={32} />
      </div>
      <h1 className="text-xl font-bold text-heading">{title}</h1>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted">
        {description || 'Esta seccion esta en construccion. Pronto estara disponible.'}
      </p>
      <span className="mt-4 inline-block rounded-full border border-line bg-surface2 px-3 py-1 text-xs font-medium text-muted">
        En construccion
      </span>
    </div>
  );
}
