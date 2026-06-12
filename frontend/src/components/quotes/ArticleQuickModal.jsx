import { useState, useEffect } from 'react';
import { articlesApi } from '../../api/articlesApi.js';
import { partCategoriesApi } from '../../api/partCategoriesApi.js';
import { notify } from '../../lib/toast.js';
import Modal from '../../components/ui/Modal.jsx';
import Input from '../../components/ui/Input.jsx';
import Button from '../../components/ui/Button.jsx';

const LABOR_PREFIX = 'MO';

export default function ArticleQuickModal({ open, onClose, onSaved, type = 'labor' }) {
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState([]);
  const [selectedCat, setSelectedCat] = useState(null);
  const [code, setCode] = useState('');
  const [form, setForm] = useState({ name:'', price:0, brand:'', description:'' });

  useEffect(() => {
    if (!open) return;
    setForm({ name:'', price:0, brand:'', description:'' });
    setSelectedCat(null);
    setCode('');
    if (type === 'labor') {
      partCategoriesApi.nextCode(LABOR_PREFIX).then(setCode);
    } else {
      partCategoriesApi.list().then(setCategories);
    }
  }, [open, type]);

  useEffect(() => {
    if (type === 'part' && selectedCat) {
      partCategoriesApi.nextCode(selectedCat.prefix).then(setCode);
    }
  }, [selectedCat, type]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.name.trim()) return notify.error('El nombre es requerido');
    if (type === 'part' && !selectedCat) return notify.error('Selecciona una categoria');
    setSaving(true);
    try {
      const payload = {
        code:         code,
        name:         form.name.trim(),
        type_id:      type === 'labor' ? 4 : 2,
        warehouse_id: type === 'labor' ? 3 : 2,
        unit:         type === 'labor' ? 'servicio' : 'unidad',
        price:        type === 'labor' ? parseFloat(form.price) || 0 : 0,
        quantity:     type === 'part'  ? 0 : 1,
        brand:        form.brand || '',
        description:  form.description || '',
        is_active:    true,
      };
      const created = await articlesApi.create(payload);
      notify.success((type === 'labor' ? 'Mano de Obra' : 'Repuesto') + ' creado: ' + code);
      onSaved(created);
    } catch(e) {
      notify.error(e.response?.data?.message || e.message || 'Error al crear');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={saving ? undefined : onClose}
      title={type === 'labor' ? 'Nueva Mano de Obra' : 'Nuevo Repuesto'}
      size="md"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSave} loading={saving}>
            {type === 'labor' ? 'Crear Mano de Obra' : 'Crear Repuesto'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">

        {/* Codigo generado automaticamente */}
        <div style={{ background:'#10b98115', border:'1px solid #10b98144', borderRadius:8, padding:'10px 14px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <span style={{ fontSize:12, color:'#10b981' }}>Codigo generado automaticamente</span>
          <span style={{ fontWeight:800, fontSize:16, color:'#10b981', letterSpacing:2 }}>{code || '...' }</span>
        </div>

        {/* Categoria solo para repuestos */}
        {type === 'part' && (
          <div>
            <label style={{ display:'block', fontSize:11, fontWeight:700, color:'#5a7aa8', marginBottom:6 }}>CATEGORIA *</label>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:6 }}>
              {categories.map(cat => (
                <button key={cat.id} onClick={() => setSelectedCat(cat)}
                  style={{
                    padding:'8px 6px', borderRadius:7, cursor:'pointer', fontSize:12, fontWeight:600,
                    background: selectedCat?.id === cat.id ? '#E8551C22' : '#112048',
                    border: '1px solid ' + (selectedCat?.id === cat.id ? '#E8551C' : '#1F3470'),
                    color: selectedCat?.id === cat.id ? '#E8551C' : '#94a3b8',
                  }}>
                  <div style={{ fontSize:10, color:'#64748b' }}>{cat.prefix}</div>
                  {cat.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {type === 'part' && (
          <div style={{ background:'#f59e0b15', border:'1px solid #f59e0b44', borderRadius:8, padding:'10px 14px', fontSize:12, color:'#f59e0b' }}>
            Se creara con <strong>stock 0 y precio Q0.00</strong>. Actualiza el precio desde Inventario cuando llegue.
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Nombre *" value={form.name} onChange={e => set('name', e.target.value)}
            placeholder={type==='labor' ? 'Ej: Rebobinado motor' : 'Ej: Rodamiento 6205'} />
          {type === 'labor' && (
            <Input label="Precio base (Q)" type="number" value={form.price} onChange={e => set('price', e.target.value)} />
          )}
          <Input label="Marca" value={form.brand} onChange={e => set('brand', e.target.value)} placeholder="Opcional" />
        </div>
        <Input label="Descripcion" value={form.description} onChange={e => set('description', e.target.value)} placeholder="Opcional" />
      </div>
    </Modal>
  );
}
