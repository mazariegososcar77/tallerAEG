// PANTALLA: Alta / edición de un artículo del inventario.
// Aquí se llenan los datos de un artículo (código, nombre, precio, bodega, etc.),
// se le puede poner una imagen, y se le agregan sus piezas y su mano de obra
// (listas simples de texto, como una lista de compras). Se usa tanto para crear
// un artículo nuevo como para editar uno existente (según si la URL trae un "id").
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Info, Boxes, Wrench } from 'lucide-react';
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
import Tabs from '../../components/ui/Tabs.jsx';
import ImagePicker from '../../components/inventory/ImagePicker.jsx';
import ItemListInput from '../../components/inventory/ItemListInput.jsx';

const emptyForm = {
  code: '',
  name: '',
  type_id: '',
  warehouse_id: '',
  quantity: 0,
  min_stock: 0,
  cost: '',
  unit: 'unidad',
  price: 0,
  brand: '',
  model: '',
  location: '',
  description: '',
  image_url: '',
  is_active: true,
  pieces: [],
  labor: [],
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
  const [tab, setTab] = useState('datos');

  // Si estamos editando un articulo existente, trae sus datos del servidor
  // y los pone en el formulario para que el usuario los pueda modificar.
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
          min_stock: a.min_stock,
          cost: a.cost ?? '',
          unit: a.unit,
          price: a.price,
          brand: a.brand,
          model: a.model,
          location: a.location,
          description: a.description,
          image_url: a.image_url,
          // Solo para la vista previa: es una direccion temporal, no se guarda.
          image_display_url: a.image_display_url,
          is_active: a.is_active,
          pieces: (a.pieces || []).map((p) => p.name),
          labor: (a.labor || []).map((l) => l.name),
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

  // Atajos para actualizar un solo campo del formulario cuando el usuario escribe o elige algo.
  const setField = (field) => (e) => setForm((p) => ({ ...p, [field]: e.target.value }));
  const setValue = (field) => (value) => setForm((p) => ({ ...p, [field]: value }));

  // Guarda el articulo: si ya existia lo actualiza, si es nuevo lo crea.
  // Si el servidor responde con errores de campos (por ejemplo, un codigo repetido),
  // los muestra debajo de cada campo y regresa a la pestaña "Datos" para que se vean.
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    const { quantity, ...rest } = form;
    const payload = {
      ...rest,
      type_id: Number(form.type_id),
      warehouse_id: Number(form.warehouse_id),
      price: Number(form.price) || 0,
      min_stock: Number(form.min_stock) || 0,
      // El precio de compra en blanco viaja como null ("todavia no se ha capturado"),
      // que no es lo mismo que un costo real de Q0.00. Si mandaramos 0 estariamos
      // diciendo que el articulo no cuesta nada.
      cost: form.cost === '' || form.cost === null || form.cost === undefined
        ? null
        : Number(form.cost),
    };
    // La existencia solo se manda al CREAR: ahi el backend la convierte en el saldo
    // inicial del kardex. Al editar no se manda, porque editar la ficha de un articulo
    // no cambia su existencia -- eso se hace con un ajuste de inventario.
    if (!isEdit) payload.quantity = Number(quantity) || 0;
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
        setTab('datos'); // los errores de campos viven en la pestaña de datos
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
        <Tabs
          className="mb-6"
          active={tab}
          onChange={setTab}
          tabs={[
            { key: 'datos', label: 'Datos del artículo', icon: <Info size={16} /> },
            { key: 'pieces', label: 'Piezas', icon: <Boxes size={16} />, count: form.pieces.length },
            { key: 'labor', label: 'Mano de obra', icon: <Wrench size={16} />, count: form.labor.length },
          ]}
        />

        {/* Pestaña: datos del articulo (codigo, nombre, tipo, bodega, cantidad, precio, etc.) */}
        <div className={tab === 'datos' ? 'grid gap-6 lg:grid-cols-3' : 'hidden'}>
          {/* Datos */}
          <Card className="space-y-4 p-6 lg:col-span-2">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Codigo / SKU" value={form.code} onChange={setField('code')} error={errors.code} required />
              <Input label="Nombre" value={form.name} onChange={setField('name')} error={errors.name} required />
              <Select label="Tipo" value={form.type_id} onChange={setValue('type_id')} options={typeOptions} error={errors.type_id} />
              <Select label="Bodega" value={form.warehouse_id} onChange={setValue('warehouse_id')} options={warehouseOptions} error={errors.warehouse_id} />
              {/* La existencia solo se escribe al dar de alta el articulo (ahi nace como su
                  saldo inicial en el kardex). Despues queda de solo lectura: cambiarla es
                  un ajuste de inventario, que deja constancia de por que cambio. Se deja
                  visible en vez de esconderla para que se vea cuanto hay sin salir de aqui. */}
              <div>
                <Input
                  label={isEdit ? 'Existencia actual' : 'Existencia inicial'}
                  type="number" min="0" step="any"
                  value={form.quantity}
                  onChange={setField('quantity')}
                  error={errors.quantity}
                  disabled={isEdit}
                />
                <p className="mt-1 text-xs text-muted">
                  {isEdit
                    ? 'La existencia se cambia con un ajuste de inventario, no desde aqui.'
                    : 'Queda registrada como saldo inicial en el kardex.'}
                </p>
              </div>
              <Input label="Unidad" value={form.unit} onChange={setField('unit')} error={errors.unit} />
              {/* Los dos precios juntos y etiquetados sin ambiguedad: el de compra es lo que
                  le cuesta a AEG (valua el inventario) y el de venta lo que se le cobra al
                  cliente. Confundirlos deja el costo de los trabajos mal calculado. */}
              <Input label="Precio de compra (Q)" type="number" min="0" step="any" value={form.cost} onChange={setField('cost')} error={errors.cost} placeholder="Sin capturar" />
              <Input label="Precio de venta (Q)" type="number" min="0" step="any" value={form.price} onChange={setField('price')} error={errors.price} />
              {/* Punto de reorden: por debajo de este nivel el articulo se considera
                  "stock bajo". A diferencia de la existencia, esto si se puede editar
                  despues de crear el articulo -- no es un saldo, es una regla de aviso. */}
              <div>
                <Input
                  label="Existencia minima (punto de reorden)"
                  type="number" min="0" step="any"
                  value={form.min_stock}
                  onChange={setField('min_stock')}
                  error={errors.min_stock}
                />
                <p className="mt-1 text-xs text-muted">0 = sin alerta de stock bajo para este articulo.</p>
              </div>
              <Input label="Marca" value={form.brand} onChange={setField('brand')} error={errors.brand} />
              <Input label="Modelo" value={form.model} onChange={setField('model')} error={errors.model} />
              <Input label="Ubicacion" value={form.location} onChange={setField('location')} error={errors.location} />
            </div>
            <Textarea label="Descripcion" rows={4} value={form.description} onChange={setField('description')} error={errors.description} />
          </Card>

          {/* Foto del articulo y si esta activo (visible para usarse) o no */}
          <Card className="flex flex-col gap-4 p-6">
            <ImagePicker
              value={form.image_url}
              previewUrl={form.image_display_url}
              onChange={setValue('image_url')}
            />
            <Checkbox label="Articulo activo" checked={form.is_active} onChange={setValue('is_active')} />
          </Card>
        </div>

        {/* Pestaña: piezas que componen este articulo (lista simple, se agregan escribiendo y con Enter) */}
        <div className={tab === 'pieces' ? 'block' : 'hidden'}>
          <Card className="p-6">
            <ItemListInput
              items={form.pieces}
              onChange={setValue('pieces')}
              label="Agregar pieza"
              placeholder="Escribe el nombre y presiona Enter"
              emptyText="Aún no hay piezas. Escribe una y presiona Enter."
              emptyIcon={<Boxes size={28} />}
            />
          </Card>
        </div>

        {/* Pestaña: tareas de mano de obra asociadas a este articulo */}
        <div className={tab === 'labor' ? 'block' : 'hidden'}>
          <Card className="p-6">
            <ItemListInput
              items={form.labor}
              onChange={setValue('labor')}
              label="Agregar mano de obra"
              placeholder="Escribe la tarea y presiona Enter"
              emptyText="Aún no hay mano de obra. Escribe una y presiona Enter."
              emptyIcon={<Wrench size={28} />}
            />
          </Card>
        </div>

        {/* Acciones (siempre visibles) */}
        <div className="mt-6 flex justify-end gap-2 border-t border-slate-200 pt-4">
          <Button variant="outline" type="button" onClick={() => navigate('/inventario')} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" loading={saving}>
            {isEdit ? 'Guardar cambios' : 'Crear articulo'}
          </Button>
        </div>
      </form>
    </div>
  );
}
