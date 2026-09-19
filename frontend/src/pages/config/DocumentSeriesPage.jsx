// ============================================================================
// PANTALLA: Configuración → Numeración de Documentos (/configuracion/numeracion)
// Cotizaciones, Órdenes de Trabajo, Órdenes de Servicio, Facturas y Reportes de
// Trabajo llevan cada uno su propio número correlativo. Antes se calculaba solo
// (el máximo ya usado + 1, sin prefijo y sin forma de tocarlo). Aquí se puede
// definir, por cada uno, un prefijo (ej. "COT-"), la cantidad de dígitos (relleno
// con ceros) y el siguiente número — este último es el "escape" para asignarlo a
// mano cuando haga falta (ej. seguir la numeración de un talonario físico, o
// corregir una base de desarrollo).
// Solo puede guardar quien tenga el permiso `document-series.update` (por
// defecto, el rol Administrador); los demás ven los valores pero no los pueden
// cambiar.
// ============================================================================
import { useEffect, useState } from 'react';
import { Hash, Save } from 'lucide-react';
import { useDocumentSeries } from '../../hooks/useDocumentSeries.js';
import { documentSeriesApi } from '../../api/documentSeriesApi.js';
import { useAuth } from '../../hooks/useAuth.js';
import { notify } from '../../lib/toast.js';
import PageHeader from '../../components/common/PageHeader.jsx';
import Input from '../../components/ui/Input.jsx';
import Button from '../../components/ui/Button.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import Tabs from '../../components/ui/Tabs.jsx';
import PartCategoriesPage from './PartCategoriesPage.jsx';

// Arma el numero de ejemplo que saldria con el prefijo/digitos/siguiente numero
// actuales (lo mismo que calcula el backend al emitir un documento nuevo).
const preview = (row) => (row.prefix || '') + String(row.next_number || 1).padStart(row.digits || 1, '0');

// Una fila editable por serie: cambia sola, sin afectar a las demas, y solo
// manda al servidor lo que realmente cambio.
function SeriesRow({ row, canEdit, onSaved }) {
  const [form, setForm] = useState(row);
  const [saving, setSaving] = useState(false);
  useEffect(() => setForm(row), [row]);

  const dirty = form.prefix !== row.prefix || Number(form.digits) !== Number(row.digits) || Number(form.next_number) !== Number(row.next_number);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await documentSeriesApi.update(row.document_type, {
        prefix: form.prefix,
        digits: Number(form.digits) || 1,
        next_number: Number(form.next_number) || 1,
      });
      notify.success(`Numeracion de "${row.label}" actualizada`);
      onSaved(updated);
    } catch (err) {
      notify.error(err.response?.data?.message || err.message || 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid items-end gap-3 border-b border-line py-4 last:border-b-0 sm:grid-cols-[1fr_120px_120px_140px_auto]">
      <div>
        <p className="text-sm font-semibold text-content">{row.label}</p>
        <p className="mt-0.5 text-xs text-muted">Siguiente: <span className="font-mono text-orange-500">{preview(form)}</span></p>
      </div>
      <Input label="Prefijo" value={form.prefix} disabled={!canEdit} placeholder="Ej: COT-"
        onChange={(e) => setForm((f) => ({ ...f, prefix: e.target.value.toUpperCase() }))} />
      <Input label="Digitos" type="number" min="1" max="10" value={form.digits} disabled={!canEdit}
        onChange={(e) => setForm((f) => ({ ...f, digits: e.target.value }))} />
      <Input label="Siguiente numero" type="number" min="1" value={form.next_number} disabled={!canEdit}
        onChange={(e) => setForm((f) => ({ ...f, next_number: e.target.value }))} />
      {canEdit && (
        <Button size="sm" onClick={handleSave} disabled={!dirty} loading={saving}>
          <Save size={14} /> Guardar
        </Button>
      )}
    </div>
  );
}

function DocumentsTab() {
  const { series, loading, reload } = useDocumentSeries();
  const { hasPermission } = useAuth();
  const canEdit = hasPermission('document-series.update');

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Numeracion de documentos" subtitle="Prefijo, digitos y siguiente numero de cada tipo de documento" emoji={<Hash size={24} />} />
      <section className="rounded-xl border border-line bg-surface p-5">
        {loading ? (
          <div className="flex justify-center py-10"><Spinner size={26} className="text-orange-500" /></div>
        ) : (
          series.map((row) => (
            <SeriesRow
              key={row.document_type}
              row={row}
              canEdit={canEdit}
              onSaved={() => reload()}
            />
          ))
        )}
      </section>
    </div>
  );
}

// La numeracion se reparte en dos pestañas: la de los documentos (cotizaciones, ordenes,
// facturas, reportes) y la de los articulos, cuyo codigo sale del prefijo de su categoria
// de pieza (ver PartCategoriesPage).
export default function DocumentSeriesPage() {
  const { hasPermission } = useAuth();
  const canSeeArticles = hasPermission('part-categories.view');
  const [tab, setTab] = useState('documentos');
  const tabs = [
    { key: 'documentos', label: 'Documentos' },
    ...(canSeeArticles ? [{ key: 'articulos', label: 'Artículos' }] : []),
  ];

  return (
    <div>
      <Tabs tabs={tabs} active={tab} onChange={setTab} className="mb-5" />
      {tab === 'documentos' ? <DocumentsTab /> : <PartCategoriesPage />}
    </div>
  );
}
