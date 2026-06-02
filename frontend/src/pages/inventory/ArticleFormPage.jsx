import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { articlesApi } from '../../api/articlesApi.js';
import { useArticleTypes } from '../../hooks/useArticleTypes.js';
import { useWarehouses } from '../../hooks/useWarehouses.js';
import { notify } from '../../lib/toast.js';
import Card from '../../components/ui/Card.jsx';
import Input from '../../components/ui/Input.jsx';
import Textarea from '../../components/ui/Textarea.jsx';
import Select from '../../components/ui/Select.jsx';
import Checkbox from '../../components/ui/Checkbox.jsx';
import Button from '../../components/ui/Button.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import ColorDot from '../../components/ui/ColorDot.jsx';
import ImagePicker from '../../components/inventory/ImagePicker.jsx';

const emptyForm = {
  code: '',
  name: '',
  type_id: '',
  warehouse_id: '',
  quantity: 0,
  unit: 'unidad',
  price: 0,
  brand: '',
  model: '',
  location: '',
  description: '',
  image_url: '',
  is_active: true,
};

export default function ArticleFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { types } = useArticleTypes();
  const { warehouses } = useWarehouses();

  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [loadingArticle, setLoadingArticle] = useState(isEdit);

  // Cargar el articulo en modo edicion.
  useEffect(() => {
    if (!isEdit) return;
    articlesApi
      .get(id)
      .then((a) =>
        setForm({
          code: a.code,
          name: a.name,
          type_id: a.type_id,
          warehouse_id: a.warehouse_id,
          quantity: a.quantity,
          unit: a.unit,
          price: a.price,
          brand: a.brand,
          model: a.model,
          location: a.location,
          description: a.description,
          image_url: a.image_url,
          is_active: a.is_active,
        }),
      )
      .catch((err) => {
        notify.error(err.message);
        navigate('/inventario');
      })
      .finally(() => setLoadingArticle(false));
  }, [id, isEdit, navigate]);

  // Valores por defecto de los selects al crear (cuando cargan los catalogos).
  useEffect(() => {
    if (isEdit) return;
    setForm((p) => ({
      ...p,
      type_id: p.type_id || types[0]?.id || '',
      warehouse_id: p.warehouse_id || warehouses[0]?.id || '',
    }));
  }, [types, warehouses, isEdit]);

  const setField = (field) => (e) => setForm((p) => ({ ...p, [field]: e.target.value }));
  const setValue = (field) => (value) => setForm((p) => ({ ...p, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    const payload = {
      ...form,
      type_id: Number(form.type_id),
      warehouse_id: Number(form.warehouse_id),
      quantity: Number(form.quantity) || 0,
      price: Number(form.price) || 0,
    };
    try {
      if (isEdit) {
        await articlesApi.update(id, payload);
        notify.success('Articulo actualizado');
      } else {
        await articlesApi.create(payload);
        notify.success('Articulo creado');
      }
      navigate('/inventario');
    } catch (err) {
      if (err.details?.length) {
        setErrors(Object.fromEntries(err.details.map((d) => [d.field, d.message])));
      }
      notify.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loadingArticle) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size={30} className="text-orange-500" />
      </div>
    );
  }

  const typeOptions = types.map((t) => ({ value: t.id, label: t.name }));
  const warehouseOptions = warehouses.map((w) => ({
    value: w.id,
    label: (
      <span className="inline-flex items-center gap-2">
        <ColorDot color={w.color} />
        {w.name}
      </span>
    ),
  }));

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={() => navigate('/inventario')}>
          <ArrowLeft size={16} /> Volver
        </Button>
        <h1 className="text-2xl font-bold text-navy-800">
          {isEdit ? 'Editar articulo' : 'Nuevo articulo'}
        </h1>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Datos */}
          <Card className="space-y-4 p-6 lg:col-span-2">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Codigo / SKU" value={form.code} onChange={setField('code')} error={errors.code} required />
              <Input label="Nombre" value={form.name} onChange={setField('name')} error={errors.name} required />
              <Select label="Tipo" value={form.type_id} onChange={setValue('type_id')} options={typeOptions} error={errors.type_id} />
              <Select label="Bodega" value={form.warehouse_id} onChange={setValue('warehouse_id')} options={warehouseOptions} error={errors.warehouse_id} />
              <Input label="Cantidad" type="number" min="0" step="any" value={form.quantity} onChange={setField('quantity')} error={errors.quantity} />
              <Input label="Unidad" value={form.unit} onChange={setField('unit')} error={errors.unit} />
              <Input label="Precio" type="number" min="0" step="any" value={form.price} onChange={setField('price')} error={errors.price} />
              <Input label="Marca" value={form.brand} onChange={setField('brand')} error={errors.brand} />
              <Input label="Modelo" value={form.model} onChange={setField('model')} error={errors.model} />
              <Input label="Ubicacion" value={form.location} onChange={setField('location')} error={errors.location} />
            </div>
            <Textarea label="Descripcion" rows={4} value={form.description} onChange={setField('description')} error={errors.description} />
          </Card>

          {/* Imagen + estado + acciones (aprovecha el alto de la columna) */}
          <Card className="flex flex-col gap-4 p-6">
            <ImagePicker value={form.image_url} onChange={setValue('image_url')} />
            <Checkbox label="Articulo activo" checked={form.is_active} onChange={setValue('is_active')} />
            <div className="mt-auto flex flex-col gap-2 border-t border-slate-200 pt-4">
              <Button type="submit" loading={saving}>
                {isEdit ? 'Guardar cambios' : 'Crear articulo'}
              </Button>
              <Button variant="outline" type="button" onClick={() => navigate('/inventario')} disabled={saving}>
                Cancelar
              </Button>
            </div>
          </Card>
        </div>
      </form>
    </div>
  );
}
