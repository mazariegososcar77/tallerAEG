import { useState } from 'react';
import { Download, Upload, CheckCircle2, AlertTriangle } from 'lucide-react';
import Modal from '../../components/ui/Modal.jsx';
import Button from '../../components/ui/Button.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import { downloadTemplate, parseFile } from '../../lib/excel.js';
import { articlesApi } from '../../api/articlesApi.js';
import { notify } from '../../lib/toast.js';

export default function BulkUploadModal({ open, onClose, onDone }) {
  const [rows, setRows] = useState([]);
  const [fileName, setFileName] = useState('');
  const [parsing, setParsing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  const reset = () => {
    setRows([]);
    setFileName('');
    setResult(null);
  };

  const handleClose = () => {
    if (submitting) return;
    reset();
    onClose();
  };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setParsing(true);
    setResult(null);
    try {
      const parsed = await parseFile(file);
      setRows(parsed);
      setFileName(file.name);
      if (!parsed.length) notify.info('El archivo no tiene filas con datos.');
    } catch {
      notify.error('No se pudo leer el archivo. Verifica que sea un .xlsx valido.');
    } finally {
      setParsing(false);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await articlesApi.bulkCreate(rows);
      setResult(res);
      if (res.created > 0) {
        notify.success(`${res.created} articulo(s) creado(s)`);
        onDone();
      } else {
        notify.error('Ningun articulo se pudo crear.');
      }
    } catch (err) {
      notify.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Carga masiva de articulos"
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={handleClose} disabled={submitting}>
            Cerrar
          </Button>
          <Button onClick={handleSubmit} loading={submitting} disabled={!rows.length}>
            Cargar {rows.length ? `(${rows.length})` : ''}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-slate-600">
          Descarga la plantilla, complétala (el <strong>tipo</strong> y la <strong>bodega</strong> se
          indican por nombre) y súbela. La imagen es opcional, como URL.
        </p>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={downloadTemplate}>
            <Download size={15} /> Descargar plantilla
          </Button>
          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md bg-surface px-3 py-1.5 text-sm font-medium text-white hover:bg-navy-800">
            <Upload size={15} /> Seleccionar Excel
            <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFile} disabled={parsing} />
          </label>
          {fileName && <span className="self-center text-xs text-slate-500">{fileName}</span>}
        </div>

        {parsing && (
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Spinner size={16} className="text-orange-500" /> Leyendo archivo...
          </div>
        )}

        {/* Previsualizacion */}
        {rows.length > 0 && (
          <div>
            <p className="mb-1 text-sm font-medium text-navy-800">Vista previa ({rows.length} filas)</p>
            <div className="max-h-56 overflow-auto rounded-lg border border-slate-200">
              <table className="min-w-full text-xs">
                <thead className="sticky top-0 bg-navy-50 text-navy-700">
                  <tr>
                    {['Codigo', 'Nombre', 'Tipo', 'Bodega', 'Cant.', 'Precio'].map((h) => (
                      <th key={h} className="px-2 py-1.5 text-left font-semibold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.slice(0, 100).map((r, i) => (
                    <tr key={i}>
                      <td className="px-2 py-1">{r.code}</td>
                      <td className="px-2 py-1">{r.name}</td>
                      <td className="px-2 py-1">{r.type}</td>
                      <td className="px-2 py-1">{r.warehouse}</td>
                      <td className="px-2 py-1">{r.quantity}</td>
                      <td className="px-2 py-1">{r.price}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {rows.length > 100 && (
              <p className="mt-1 text-xs text-slate-400">Mostrando las primeras 100 filas.</p>
            )}
          </div>
        )}

        {/* Resultado */}
        {result && (
          <div className="space-y-2 rounded-lg border border-slate-200 p-3">
            <p className="flex items-center gap-2 text-sm font-medium text-green-700">
              <CheckCircle2 size={16} /> {result.created} creado(s)
            </p>
            {result.errors.length > 0 && (
              <div>
                <p className="flex items-center gap-2 text-sm font-medium text-red-600">
                  <AlertTriangle size={16} /> {result.errors.length} con error
                </p>
                <ul className="mt-1 max-h-32 space-y-0.5 overflow-auto text-xs text-slate-600">
                  {result.errors.map((e, i) => (
                    <li key={i}>
                      Fila {e.row}: {e.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
